pragma solidity ^0.4.18;

import "./ITopicEvent.sol";
import "../BaseContract.sol";
import "../storage/IAddressManager.sol";
import "../oracles/IOracleFactory.sol";
import "../tokens/ERC20.sol";
import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";
import "../libs/ByteUtils.sol";

contract TopicEvent is ITopicEvent, BaseContract, Ownable {
    using ByteUtils for bytes32;
    using SafeMath for uint256;

    /*
    * @notice Status types
    *   Betting: Bet with QTUM during this phase.
    *   Arbitration: Vote with BOT during this phase.
    *   Collection: Winners collect their winnings during this phase.
    */
    enum Status {
        Betting,
        OracleVoting,
        Collection
    }

    struct Oracle {
        address oracleAddress;
        bool didSetResult;
    }

    bool public resultSet;
    Status public status = Status.Betting;
    bytes32[10] public eventName;
    bytes32[11] public eventResults;
    uint256 public totalQtumValue;
    uint256 public totalBotValue;
    IAddressManager private addressManager;
    ERC20 private token;
    Oracle[] public oracles;
    mapping(address => bool) public didWithdraw;

    // Events
    event FinalResultSet(
        uint16 indexed _version, 
        address indexed _eventAddress, 
        uint8 _finalResultIndex);
    event WinningsWithdrawn(
        uint16 indexed _version, 
        address indexed _winner, 
        uint256 _qtumTokenWon, 
        uint256 _botTokenWon);

    // Modifiers
    modifier fromCentralizedOracle() {
        require(msg.sender == oracles[0].oracleAddress);
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
    * @param _version The contract version.
    * @param _owner The address of the owner.
    * @param _centralizedOracle The address of the CentralizedOracle that will decide the result.
    * @param _name The question or statement prediction broken down by multiple bytes32.
    * @param _resultNames The possible results.
    * @param _bettingStartBlock The block when betting will start.
    * @param _bettingEndBlock The block when betting will end.
    * @param _resultSettingStartBlock The first block the CentralizedOracle can set the result.
    * @param _resultSettingEndBlock The last block the CentralizedOracle can set the result.
    * @param _addressManager The address of the AddressManager.
    */
    function TopicEvent(
        uint16 _version,
        address _owner,
        address _centralizedOracle,
        bytes32[10] _name,
        bytes32[10] _resultNames,
        uint256 _bettingStartBlock,
        uint256 _bettingEndBlock,
        uint256 _resultSettingStartBlock,
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
        require(_bettingEndBlock > _bettingStartBlock);
        require(_resultSettingStartBlock >= _bettingEndBlock);
        require(_resultSettingEndBlock > _resultSettingStartBlock);

        version = _version;
        owner = _owner;
        eventName = _name;

        eventResults[0] = "Invalid";
        numOfResults++;
        for (uint i = 0; i < _resultNames.length; i++) {
            if (!_resultNames[i].isEmpty()) {
                eventResults[i + 1] = _resultNames[i];
                numOfResults++;
            } else {
                break;
            }
        }

        addressManager = IAddressManager(_addressManager);
        token = ERC20(addressManager.bodhiTokenAddress());

        createCentralizedOracle(_centralizedOracle, _bettingStartBlock, _bettingEndBlock, _resultSettingStartBlock,
            _resultSettingEndBlock);
    }

    /// @notice Fallback function that rejects any amount sent to the contract.
    function() external payable {
        revert();
    }

    /*
    * @dev CentralizedOracle contract can call this method to bet.
    * @param _better The address that is placing the bet.
    * @param _resultIndex The index of result to bet on.
    */
    function betFromOracle(address _better, uint8 _resultIndex) 
        external 
        payable
        validAddress(_better)
        validResultIndex(_resultIndex)
        fromCentralizedOracle()
    {
        require(msg.value > 0);

        balances[_resultIndex].totalBets = balances[_resultIndex].totalBets.add(msg.value);
        balances[_resultIndex].bets[_better] = balances[_resultIndex].bets[_better].add(msg.value);
        totalQtumValue = totalQtumValue.add(msg.value);
    }

    /* 
    * @dev CentralizedOracle contract can call this method to set the result.
    * @param _oracle The address of the CentralizedOracle.
    * @param _resultIndex The index of the result to set.
    * @param _consensusThreshold The BOT threshold that the CentralizedOracle has to contribute to validate the result.
    */
    function centralizedOracleSetResult(
        address _oracle, 
        uint8 _resultIndex, 
        uint256 _consensusThreshold)
        external 
        validResultIndex(_resultIndex)
        fromCentralizedOracle()
    {
        require(!oracles[0].didSetResult);
        require(token.allowance(_oracle, address(this)) >= _consensusThreshold);
        require(status == Status.Betting);

        oracles[0].didSetResult = true;
        resultSet = true;
        status = Status.OracleVoting;
        resultIndex = _resultIndex;

        balances[_resultIndex].totalVotes = balances[_resultIndex].totalVotes.add(_consensusThreshold);
        balances[_resultIndex].votes[_oracle] = balances[_resultIndex].votes[_oracle].add(_consensusThreshold);
        totalBotValue = totalBotValue.add(_consensusThreshold);

        token.transferFrom(_oracle, address(this), _consensusThreshold);
        createDecentralizedOracle(_consensusThreshold);
    }

    /*
    * @dev DecentralizedOracle contract can call this method to vote for a user. Voter must BOT approve() with the 
    *   amount to TopicEvent address before voting.
    * @param _resultIndex The index of result to vote on.
    * @param _sender The address of the person voting on a result.
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

        balances[_resultIndex].totalVotes = balances[_resultIndex].totalVotes.add(_amount);
        balances[_resultIndex].votes[_sender] = balances[_resultIndex].votes[_sender].add(_amount);
        totalBotValue = totalBotValue.add(_amount);

        return token.transferFrom(_sender, address(this), _amount);
    }

    /* 
    * @dev DecentralizedOracle contract can call this to set the result after vote passes consensus threshold.
    * @param _resultIndex The index of the result to set.
    * @param _currentConsensusThreshold The current consensus threshold for the Oracle.
    */
    function decentralizedOracleSetResult(uint8 _resultIndex, uint256 _currentConsensusThreshold)
        external 
        validResultIndex(_resultIndex)
        returns (bool)
    {
        bool isValidOracle = false;
        uint8 oracleIndex;
        for (uint8 i = 1; i < oracles.length; i++) {
            if (msg.sender == oracles[i].oracleAddress && !oracles[i].didSetResult) {
                isValidOracle = true;
                oracleIndex = i;
                break;
            }
        }
        require(isValidOracle);

        oracles[oracleIndex].didSetResult = true;
        resultSet = true;
        status = Status.OracleVoting;
        resultIndex = _resultIndex;

        return createDecentralizedOracle(_currentConsensusThreshold.add(addressManager.consensusThresholdIncrement()));
    }

    /*
    * @dev The last DecentralizedOracle contract can call this method to change status to Collection.
    * @return Flag to indicate success of finalizing the result.
    */
    function decentralizedOracleFinalizeResult() 
        external 
        returns (bool)
    {
        require(msg.sender == oracles[oracles.length - 1].oracleAddress);
        require(status == Status.OracleVoting);

        status = Status.Collection;
 
        FinalResultSet(version, address(this), resultIndex);

        return true;
    }

    /*
    * @notice Allows winners of the Event to withdraw their QTUM and BOT winnings after the final result is set.
    */
    function withdrawWinnings() 
        external 
        inCollectionStatus()
    {
        require(!didWithdraw[msg.sender]);

        didWithdraw[msg.sender] = true;

        uint256 qtumWon = calculateQtumContributorWinnings();
        uint256 qtumReturn;
        uint256 botWon;
        (qtumReturn, botWon) = calculateBotContributorWinnings();
        qtumWon = qtumWon.add(qtumReturn);

        if (qtumWon > 0) {
            msg.sender.transfer(qtumWon);
        }
        if (botWon > 0) {
            token.transfer(msg.sender, botWon);
        }

        WinningsWithdrawn(version, msg.sender, qtumWon, botWon);
    }

    /*
    * @notice Gets the final result index and flag indicating if the result is final.
    * @return The result index and finalized bool.
    */
    function getFinalResult() 
        public 
        view
        returns (uint8, bool) 
    {
        return (resultIndex, status == Status.Collection);
    }

    /* 
    * @notice Calculates the QTUM tokens won based on the sender's QTUM token contributions.
    * @return The amount of QTUM tokens won.
    */
    function calculateQtumContributorWinnings() 
        public 
        view
        inCollectionStatus()
        returns (uint256)  
    {
        uint256 senderContribution = balances[resultIndex].bets[msg.sender];
        uint256 winnersTotal = balances[resultIndex].totalBets;
        uint256 losersTotalMinusCut = 0;
        for (uint8 i = 0; i < numOfResults; i++) {
            if (i != resultIndex) {
                losersTotalMinusCut = losersTotalMinusCut.add(balances[i].totalBets);
            }
        }
        losersTotalMinusCut = losersTotalMinusCut.mul(90).div(100);
        uint256 senderContributionMinusCut = senderContribution.mul(90).div(100);
        return senderContribution.mul(losersTotalMinusCut).div(winnersTotal).add(senderContributionMinusCut);
    }

    /*
    * @notice Calculates the QTUM and BOT tokens won based on the sender's BOT contributions.
    * @return The amount of QTUM and BOT tokens won.
    */
    function calculateBotContributorWinnings()
        public
        view
        inCollectionStatus()
        returns (uint256, uint256) 
    {
        // Calculate BOT won
        uint256 senderContribution = balances[resultIndex].votes[msg.sender];
        uint256 winnersTotal = balances[resultIndex].totalVotes;
        uint256 losersTotal = 0;
        for (uint8 i = 0; i < numOfResults; i++) {
            if (i != resultIndex) {
                losersTotal = losersTotal.add(balances[i].totalVotes);
            }
        }
        uint256 botWon = senderContribution.mul(losersTotal).div(winnersTotal).add(senderContribution);

        // Calculate QTUM won
        uint256 qtumReward = totalQtumValue.mul(10).div(100);
        uint256 qtumWon = senderContribution.mul(qtumReward).div(winnersTotal);

        return (qtumWon, botWon);
    }

    function createCentralizedOracle(
        address _centralizedOracle, 
        uint256 _bettingStartBlock,
        uint256 _bettingEndBlock, 
        uint256 _resultSettingStartBlock,
        uint256 _resultSettingEndBlock)
        private
    {
        address oracleFactory = addressManager.getOracleFactoryAddress(version);
        address newOracle = IOracleFactory(oracleFactory).createCentralizedOracle(address(this), 
            numOfResults, _centralizedOracle, _bettingStartBlock, _bettingEndBlock, _resultSettingStartBlock, 
            _resultSettingEndBlock, addressManager.startingOracleThreshold());
        
        assert(newOracle != address(0));
        oracles.push(Oracle({
            oracleAddress: newOracle,
            didSetResult: false
            }));
    }

    function createDecentralizedOracle(uint256 _consensusThreshold) 
        private 
        returns (bool)
    {
        address oracleFactory = addressManager.getOracleFactoryAddress(version);
        uint256 arbitrationBlockLength = uint256(addressManager.arbitrationBlockLength());
        address newOracle = IOracleFactory(oracleFactory).createDecentralizedOracle(address(this), numOfResults, 
            resultIndex, block.number.add(arbitrationBlockLength), _consensusThreshold);
        
        assert(newOracle != address(0));
        oracles.push(Oracle({
            oracleAddress: newOracle,
            didSetResult: false
            }));

        return true;
    }
}
