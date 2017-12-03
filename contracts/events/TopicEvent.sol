pragma solidity ^0.4.18;

import "./ITopicEvent.sol";
import "../storage/IAddressManager.sol";
import "../oracles/IOracleFactory.sol";
import "../tokens/ERC20.sol";
import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";
import "../libs/ByteUtils.sol";
import "../ReentrancyGuard.sol";

contract TopicEvent is ITopicEvent, Ownable, ReentrancyGuard {
    using ByteUtils for bytes32;
    using SafeMath for uint256;

    /*
    * @notice Status types
    *   Betting: Bets with blockchain token are allowed during this phase.
    *   Arbitration: Voting takes place in the VotingOracles during this phase.
    *   Collection: Winners can collect their won tokens during this phase.
    */
    enum Status {
        Betting,
        OracleVoting,
        Collection
    }

    struct ResultBalance {
        uint256 totalBetBalance;
        uint256 totalVoteBalance;
        mapping(address => uint256) betBalances;
        mapping(address => uint256) voteBalances;
    }

    struct Oracle {
        bool didSetResult;
        address oracleAddress;
    }

    bool public resultSet;
    uint8 private finalResultIndex;
    uint8 public numOfResults;
    Status public status = Status.Betting;
    bytes32[10] private name;
    bytes32[10] public resultNames;
    uint256 public totalBotValue;
    ResultBalance[10] private balances;
    IAddressManager private addressManager;
    ERC20 private token;
    Oracle[] public oracles;

    // Events
    event CentralizedOracleResultSet(uint8 _resultIndex);
    event FinalResultSet(uint8 _finalResultIndex);
    event WinningsWithdrawn(address indexed _winner, uint256 _blockchainTokenWon, uint256 _botTokenWon);

    // Modifiers
    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }

    modifier resultIsSet() {
        require(resultSet);
        _;
    }

    modifier inCollectionStatus() {
        require(status == Status.Collection);
        _;
    }

    /*
    * @notice Creates new TopicEvent contract.
    * @param _owner The address of the owner.
    * @param _oracle The address of the Centralized Oracle that will decide the result.
    * @param _name The question or statement prediction broken down by multiple bytes32.
    * @param _resultNames The possible results.
    * @param _bettingEndBlock The block when betting will end.
    * @param _resultSettingEndBlock The last block the Centralized Oracle can set the result.
    * @param _addressManager The address of the AddressManager.
    */
    function TopicEvent(
        address _owner,
        address _centralizedOracle,
        bytes32[10] _name,
        bytes32[10] _resultNames,
        uint256 _bettingEndBlock,
        uint256 _resultSettingEndBlock,
        address _addressManager)
        Ownable(_owner)
        public
        validAddress(_centralizedOracle)
        validAddress(_addressManager)
    {
        require(!_name[0].isEmpty());
        require(!_resultNames[0].isEmpty());
        require(!_resultNames[1].isEmpty());
        require(_bettingEndBlock > block.number);
        require(_resultSettingEndBlock > _bettingEndBlock);

        owner = _owner;
        name = _name;
        resultNames = _resultNames;

        for (uint i = 0; i < _resultNames.length; i++) {
            if (!_resultNames[i].isEmpty()) {
                balances[i] = ResultBalance({
                    totalBetBalance: 0,
                    totalVoteBalance: 0
                    });
                numOfResults++;
            } else {
                break;
            }
        }

        addressManager = IAddressManager(_addressManager);
        token = ERC20(addressManager.bodhiTokenAddress());

        createCentralizedOracle(_centralizedOracle, _bettingEndBlock, _resultSettingEndBlock);
    }

    /// @notice Fallback function that rejects any amount sent to the contract.
    function() external payable {
        revert();
    }

    /*
    * @notice Allows betting on a result using the blockchain token.
    * @param _resultIndex The index of result to bet on.
    */
    function bet(uint8 _resultIndex) 
        external 
        payable
        validResultIndex(_resultIndex)
    {
        require(msg.value > 0);

        ResultBalance storage resultBalance = balances[_resultIndex];
        resultBalance.totalBetBalance = resultBalance.totalBetBalance.add(msg.value);
        resultBalance.betBalances[msg.sender] = resultBalance.betBalances[msg.sender].add(msg.value);
    }

    /* 
    * @dev The CentralizedOracle should call setResult() from the CentralizedOracle contract. 
    * @param _resultIndex The index of the result to set.
    * @param _botAmount The amount of BOT to transfer.
    */
    function centralizedOracleSetResult(uint8 _resultIndex, uint256 _botAmount, uint256 _consensusThreshold)
        external 
        validResultIndex(_resultIndex)
    {
        require(msg.sender == oracles[0].oracleAddress);
        require(!oracles[0].didSetResult);
        require(_botAmount >= _consensusThreshold);
        require(token.allowance(msg.sender, address(this)) >= _consensusThreshold);
        require(status == Status.Betting);

        oracles[0].didSetResult = true;
        resultSet = true;
        status = Status.OracleVoting;
        finalResultIndex = _resultIndex;

        ResultBalance storage resultBalance = balances[_resultIndex];
        resultBalance.totalVoteBalance = resultBalance.totalVoteBalance.add(_botAmount);
        resultBalance.voteBalances[msg.sender] = resultBalance.voteBalances[msg.sender].add(_botAmount);
        totalBotValue = totalBotValue.add(_consensusThreshold);

        token.transferFrom(msg.sender, address(this), _consensusThreshold);
        createVotingOracle(_consensusThreshold);
    }

    /* 
    * @notice Allows anyone to set the result based on majority vote if the CentralizedOracle does not set the result 
    *   in time.
    * @dev invalidateOracle() should be called from the CentralizedOracle contract to execute this.
    */
    function invalidateCentralizedOracle(uint8 _resultIndex) 
        external 
        validResultIndex(_resultIndex)
    {
        require(msg.sender == oracles[0].oracleAddress);
        require(!oracles[0].didSetResult);
        require(status == Status.Betting);

        oracles[0].didSetResult = true;
        resultSet = true;
        status = Status.OracleVoting;
        finalResultIndex = _resultIndex;

        createVotingOracle(addressManager.startingOracleThreshold());
    }

    /*
    * @dev VotingOracles will call this to vote on a Result on behalf of a participant. Participants must BOT approve()
    *   with the amount before voting. We are storing the voted amounts here to have a centralized contract to withdraw
    *   winnings.
    * @param _resultIndex The index of Result to vote on.
    * @param _sender The address of the person voting on a Result.
    * @param _amount The BOT amount used to vote.
    * @return Flag indicating a successful transfer.
    */
    function voteFromOracle(uint8 _resultIndex, address _sender, uint256 _amount)
        external
        validResultIndex(_resultIndex)
        returns (bool)
    {
        bool isValidOracle = false;
        for (uint8 i = 1; i < oracles.length; i++) {
            if (msg.sender == oracles[i].oracleAddress) {
                isValidOracle = true;
                break;
            }
        }
        require(isValidOracle);
        require(_amount > 0);
        require(token.allowance(_sender, address(this)) >= _amount);

        ResultBalance storage resultBalance = balances[_resultIndex];
        resultBalance.totalVoteBalance = resultBalance.totalVoteBalance.add(_amount);
        resultBalance.voteBalances[_sender] = resultBalance.voteBalances[_sender].add(_amount);
        totalBotValue = totalBotValue.add(_amount);

        return token.transferFrom(_sender, address(this), _amount);
    }

    /* 
    * @dev VotingOracle should call this to set the result. Should be allowed when the Oracle passes the consensus 
    *   threshold.
    * @param _resultIndex The index of the result to set.
    * @param _currentConsensusThreshold The current consensus threshold for the Oracle.
    */
    function votingOracleSetResult(uint8 _resultIndex, uint256 _currentConsensusThreshold)
        external 
        validResultIndex(_resultIndex)
        returns (bool)
    {
        bool isValidVotingOracle = false;
        uint8 oracleIndex;
        for (uint8 i = 1; i < oracles.length; i++) {
            if (msg.sender == oracles[i].oracleAddress && !oracles[i].didSetResult) {
                isValidVotingOracle = true;
                oracleIndex = i;
                break;
            }
        }
        require(isValidVotingOracle);

        oracles[oracleIndex].didSetResult = true;
        resultSet = true;
        status = Status.OracleVoting;
        finalResultIndex = _resultIndex;

        return createVotingOracle(_currentConsensusThreshold.add(addressManager.consensusThresholdIncrement()));
    }

    /*
    * @notice This can be called by anyone from the last VotingOracle if it did not meet the consensus threshold 
    *   and will set Status: Collection to allow winners to withdraw winnings from this Event.
    * @dev This should be called by last VotingOracle contract. Validation of being able to finalize will be in the 
    *   VotingOracle contract.
    * @return Flag to indicate success of finalizing the result.
    */
    function finalizeResult() 
        external 
        returns (bool)
    {
        require(msg.sender == oracles[oracles.length - 1].oracleAddress);
        require(status == Status.OracleVoting);

        status = Status.Collection;
 
        FinalResultSet(finalResultIndex);

        return true;
    }

    /*
    * @notice Allows winners of the Event to withdraw their blockchain and BOT winnings after the final result is set.
    */
    function withdrawWinnings() 
        public 
        resultIsSet()
        inCollectionStatus()
        nonReentrant()
    {
        require(getTotalBetBalance() > 0);

        ResultBalance storage resultBalance = balances[finalResultIndex];
        uint256 blockchainTokensWon = calculateBlockchainTokensWon();
        uint256 botTokensWon = calculateBotTokensWon();

        resultBalance.betBalances[msg.sender] = 0;
        resultBalance.voteBalances[msg.sender] = 0;

        if (blockchainTokensWon > 0) {
            msg.sender.transfer(blockchainTokensWon);
        }
        if (botTokensWon > 0) {
            token.transfer(msg.sender, botTokensWon);
        }

        WinningsWithdrawn(msg.sender, blockchainTokensWon, botTokensWon);
    }

    /*
    * @notice Gets the Oracle's address and flag indicating if it set it's result.
    * @param _oracleIndex The index of the Oracle in the array.
    * @return The Oracle address and boolean indicating if it set it's result.
    */
    function getOracle(uint8 _oracleIndex)
        public 
        view 
        returns (address, bool)
    {
        return (oracles[_oracleIndex].oracleAddress, oracles[_oracleIndex].didSetResult);
    }

    /*
    * @notice Gets the Event name as a string.
    * @return The name of the Event.
    */
    function getEventName() 
        public 
        view 
        returns (string) 
    {
        return ByteUtils.toString(name);
    }

    /*
    * @notice Gets the bet balances of the sender for all the results.
    * @return An array of all the bet balances of the sender.
    */
    function getBetBalances() 
        public
        view
        returns (uint256[10]) 
    {
        uint256[10] memory betBalances;
        for (uint8 i = 0; i < numOfResults; i++) {
            betBalances[i] = balances[i].betBalances[msg.sender];
        }
        return betBalances;
    }

    /*
    * @notice Gets the vote balances of the sender for all the results.
    * @return An array of all the vote balances of the sender.
    */
    function getVoteBalances() 
        public
        view
        returns (uint256[10]) 
    {
        uint256[10] memory voteBalances;
        for (uint8 i = 0; i < numOfResults; i++) {
            voteBalances[i] = balances[i].voteBalances[msg.sender];
        }
        return voteBalances;
    }

    /*
    * @notice Gets the total blockchain token bet balance of the TopicEvent.
    * @return The total blockchain token bet balance.
    */
    function getTotalBetBalance() 
        public 
        view 
        returns (uint256) 
    {
        uint256 totalTopicBalance = 0;
        for (uint i = 0; i < numOfResults; i++) {
            totalTopicBalance = balances[i].totalBetBalance.add(totalTopicBalance);
        }
        return totalTopicBalance;
    }

    /*
    * @notice Gets the total BOT token vote balance of the TopicEvent and it's VotingOracles.
    * @return The total BOT token vote balance.
    */
    function getTotalVoteBalance() 
        public 
        view 
        returns (uint256) 
    {
        uint256 totalVoteBalance = 0;
        for (uint i = 0; i < numOfResults; i++) {
            totalVoteBalance = balances[i].totalVoteBalance.add(totalVoteBalance);
        }
        return totalVoteBalance;
    }

    /*
    * @notice Gets the final result index and name set by the Oracle (if it was set).
    * @return The index and name of the final result.
    */
    function getFinalResult() 
        public 
        view
        resultIsSet()
        returns (uint8, bytes32) 
    {
        return (finalResultIndex, resultNames[finalResultIndex]);
    }

    /* 
    * @dev Calculates the blockchain tokens won based on the sender's contributions.
    * @return The amount of blockchain tokens won.
    */
    function calculateBlockchainTokensWon() 
        public
        view
        inCollectionStatus()
        returns (uint256) 
    {
        uint256 losingResultsTotal = 0;
        for (uint8 i = 0; i < numOfResults; i++) {
            if (i != finalResultIndex) {
                losingResultsTotal = losingResultsTotal.add(balances[i].totalBetBalance);
            }
        }

        uint256 senderBetBalance = balances[finalResultIndex].betBalances[msg.sender];
        uint256 winningResultTotal = balances[finalResultIndex].totalBetBalance;
        return senderBetBalance.mul(losingResultsTotal).div(winningResultTotal).add(senderBetBalance);
    }

    /*
    * @dev Calculates the BOT tokens won based on the sender's contributions.
    * @return The amount of BOT tokens won.
    */
    function calculateBotTokensWon() 
        public
        view
        inCollectionStatus()
        returns (uint256) 
    {
        uint256 betBalance = balances[finalResultIndex].betBalances[msg.sender];
        uint256 voteBalance = balances[finalResultIndex].voteBalances[msg.sender];
        uint256 totalContribution = betBalance.add(voteBalance);

        uint256 totalWinningBets = balances[finalResultIndex].totalBetBalance;
        uint256 totalWinningVotes = balances[finalResultIndex].totalVoteBalance;
        uint256 totalWinningContribution = totalWinningBets.add(totalWinningVotes);

        uint256 totalLosingVotes = totalBotValue.sub(totalWinningVotes);
        return totalContribution.mul(totalLosingVotes).div(totalWinningContribution).add(voteBalance);
    }

    function createCentralizedOracle(
        address _centralizedOracle, 
        uint256 _bettingEndBlock, 
        uint256 _resultSettingEndBlock)
        private
    {
        uint16 index = addressManager.getLastOracleFactoryIndex();
        address oracleFactory = addressManager.getOracleFactoryAddress(index);
        address newOracle = IOracleFactory(oracleFactory).createCentralizedOracle(_centralizedOracle, address(this), 
            name, resultNames, numOfResults, _bettingEndBlock, _resultSettingEndBlock, 
            addressManager.startingOracleThreshold());
        
        assert(newOracle != address(0));
        oracles.push(Oracle({
            oracleAddress: newOracle,
            didSetResult: false
            }));
    }

    /*
    * @dev Creates a VotingOracle for this Event.
    * @return Flag indicating successful creation of VotingOracle.
    */
    function createVotingOracle(uint256 _consensusThreshold) 
        private 
        returns (bool)
    {
        uint16 index = addressManager.getLastOracleFactoryIndex();
        address oracleFactory = addressManager.getOracleFactoryAddress(index);
        uint256 arbitrationBlockLength = uint256(addressManager.arbitrationBlockLength());
        address newOracle = IOracleFactory(oracleFactory).createDecentralizedOracle(address(this), name, resultNames, 
            numOfResults, finalResultIndex, block.number.add(arbitrationBlockLength), _consensusThreshold);
        
        assert(newOracle != address(0));
        oracles.push(Oracle({
            oracleAddress: newOracle,
            didSetResult: false
            }));

        return true;
    }
}
