pragma solidity ^0.4.18;

import "../storage/IAddressManager.sol";
import "../oracles/IOracleFactory.sol";
import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";
import "../libs/ByteUtils.sol";
import "../ReentrancyGuard.sol";

contract TopicEvent is Ownable, ReentrancyGuard {
    using ByteUtils for bytes32;
    using SafeMath for uint256;

    /*
    * @notice Status types
    *   Betting: betting phase on the TopicEvent
    *   Arbitration: Voting Oracle phase
    *   Collection: winners can collect their winnings
    */
    enum Status {
        Betting,
        OracleVoting,
        Collection
    }

    struct ResultBalance {
        uint256 balance;
        mapping (address => uint256) betBalances;
    }

    struct Oracle {
        bool didSetResult;
        address oracleAddress;
    }

    bool public resultSet;
    uint8 private finalResultIndex;
    uint8 public numOfResults;
    Status public status = Status.Betting;
    uint256 public bettingEndBlock;
    uint256 public resultSettingEndBlock;
    bytes32[10] private name;
    bytes32[10] public resultNames;
    ResultBalance[10] private balances;
    IAddressManager private addressManager;
    Oracle[] public oracles;

    // Events
    event BetAccepted(address _better, uint8 _resultIndex, uint256 _betAmount, uint256 _betBalance);
    event WinningsWithdrawn(uint256 _amountWithdrawn);
    event FinalResultSet(uint8 _finalResultIndex);
    event OracleCreated(address indexed _oracleAddress);

    // Modifiers
    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }

    modifier hasEnded() {
        require(block.number >= bettingEndBlock);
        _;
    }

    modifier resultIsSet() {
        require(resultSet);
        _;
    }

    /// @notice Creates new TopicEvent contract.
    /// @param _owner The address of the owner.
    /// @param _oracle The address of the individual Oracle that will decide the result.
    /// @param _name The question or statement of the TopicEvent broken down by multiple bytes32.
    /// @param _resultNames The possible results of the TopicEvent.
    /// @param _bettingEndBlock The block when TopicEvent voting will end.
    /// @param _resultSettingEndBlock The last block the Individual Oracle can set the result.
    function TopicEvent(
        address _owner,
        address _oracle,
        bytes32[10] _name,
        bytes32[10] _resultNames,
        uint256 _bettingEndBlock,
        uint256 _resultSettingEndBlock,
        address _addressManager)
        Ownable(_owner)
        public
        validAddress(_oracle)
        validAddress(_addressManager)
    {
        require(!_name[0].isEmpty());
        require(!_resultNames[0].isEmpty());
        require(!_resultNames[1].isEmpty());
        require(_bettingEndBlock > block.number);
        require(_resultSettingEndBlock > _bettingEndBlock);

        owner = _owner;
        oracles.push(Oracle({
            oracleAddress: _oracle,
            didSetResult: false
            }));
        
        name = _name;
        resultNames = _resultNames;

        for (uint i = 0; i < _resultNames.length; i++) {
            if (!_resultNames[i].isEmpty()) {
                balances[i] = ResultBalance({
                    balance: 0
                    });
                numOfResults++;
            } else {
                break;
            }
        }

        bettingEndBlock = _bettingEndBlock;
        resultSettingEndBlock = _resultSettingEndBlock;

        addressManager = IAddressManager(_addressManager);
    }

    /// @notice Fallback function that rejects any amount sent to the contract.
    function() external payable {
        revert();
    }

    /// @notice Allows betting on a specific result.
    /// @param _resultIndex The index of result to bet on.
    function bet(uint8 _resultIndex) 
        external 
        payable
        validResultIndex(_resultIndex)
        nonReentrant()
    {
        require(block.number < bettingEndBlock);
        require(msg.value > 0);

        ResultBalance storage resultBalance = balances[_resultIndex];
        resultBalance.balance = resultBalance.balance.add(msg.value);
        resultBalance.betBalances[msg.sender] = resultBalance.betBalances[msg.sender].add(msg.value);
        balances[_resultIndex] = resultBalance;

        BetAccepted(msg.sender, _resultIndex, msg.value, balances[_resultIndex].betBalances[msg.sender]);
    }

    /// @notice Allows anyone to start a Voting Oracle if the Individual Oracle did not set a result in time.
    /// @dev This insures the funds don't get locked up in the contract. The Voting Oracle allows voting on all results.
    function invalidateOracle() external {
        require(block.number >= resultSettingEndBlock);
        require(status == Status.Betting);

        status = Status.OracleVoting;
        createOracle();
    }

    /// @notice Allows the Oracle to reveal the result.
    /// @param _resultIndex The index of result to reveal.
    function revealResult(uint8 _resultIndex)
        public
        validResultIndex(_resultIndex)
    {
        bool isValidOracle = false;
        for (uint8 i = 0; i < oracles.length; i++) {
            if (msg.sender == oracles[i].oracleAddress && !oracles[i].didSetResult) {
                isValidOracle = true;
                break;
            }
        }
        require(isValidOracle);
        require(block.number >= bettingEndBlock);

        if (msg.sender == oracles[0].oracleAddress) {
            status = Status.OracleVoting;
            createOracle();
        }

        resultSet = true;
        finalResultIndex = _resultIndex;

        FinalResultSet(finalResultIndex);
    }

    /// @notice Allows winners of the event to withdraw their winnings after the final result is set.
    function withdrawWinnings() 
        public 
        hasEnded 
        resultIsSet
    {
        require(status == Status.Collection);

        ResultBalance storage resultBalance = balances[finalResultIndex];
        uint256 betBalance = resultBalance.betBalances[msg.sender];
        require(betBalance > 0);

        uint256 totalTopicBalance = getTotalTopicBalance();
        require(totalTopicBalance > 0);

        uint256 withdrawAmount = totalTopicBalance.mul(betBalance).div(resultBalance.balance);
        require(withdrawAmount > 0);

        // Clear out balance in case withdrawBet() is called again before the prior transfer is complete
        resultBalance.betBalances[msg.sender] = 0;
        msg.sender.transfer(withdrawAmount);

        WinningsWithdrawn(withdrawAmount);
    }

    /*
    * @notice This can be called by anyone from the last Voting Oracle if it did not meet the threshold 
    *   and will set Status: Collection to allow winners to withdraw from this Event and all it's Oracles.
    * @dev This should be called by last Oracle contract. Validation of being able to finalize will be in the Oracle.
    * @return Flag to indicate success of finalizing the result.
    */
    function finalizeResult() 
        public 
        returns (bool)
    {
        bool isValidSender = false;
        for (uint8 i = 1; i < oracles.length; i++) {
            if (msg.sender == oracles[i].oracleAddress) {
                isValidSender = true;
                break;
            }
        }
        require(isValidSender);
        require(status == Status.OracleVoting);

        status = Status.Collection;
        return true;
    }

    /// @notice Gets the Oracle's address and flag indicating if it set it's result.
    /// @param _oracleIndex The index of the Oracle in the array.
    /// @return The Oracle address and boolean indicating if it set it's result.
    function getOracle(uint8 _oracleIndex)
        public 
        view 
        returns (address, bool)
    {
        return (oracles[_oracleIndex].oracleAddress, oracles[_oracleIndex].didSetResult);
    }

    /// @notice Gets the Event name as a string.
    /// @return The name of the Event.
    function getEventName() 
        public 
        view 
        returns (string) 
    {
        return ByteUtils.toString(name);
    }

    /// @notice Gets the result's balance given the index.
    /// @param _resultIndex The index of the result.
    /// @return The result total bet balance.
    function getResultBalance(uint8 _resultIndex) 
        public 
        view 
        validResultIndex(_resultIndex) 
        returns (uint256) 
    {
        return balances[_resultIndex].balance;
    }

    /// @notice Gets the result's bet balance of the caller given the index.
    /// @param _resultIndex The index of the result.
    /// @return The result's bet balance for the caller.
    function getBetBalance(uint8 _resultIndex) 
        public
        view
        validResultIndex(_resultIndex) 
        returns (uint256) 
    {
        return balances[_resultIndex].betBalances[msg.sender];
    }

    /// @notice Gets the total bet balance of the TopicEvent.
    /// @return The total bet balance.
    function getTotalTopicBalance() 
        public 
        view 
        returns (uint256) 
    {
        uint256 totalTopicBalance = 0;
        for (uint i = 0; i < balances.length; i++) {
            totalTopicBalance = balances[i].balance.add(totalTopicBalance);
        }
        return totalTopicBalance;
    }

    /// @notice Gets the final result index set by the Oracle (if it was set).
    /// @return The index of the final result.
    function getFinalResultIndex() 
        public 
        view
        resultIsSet
        returns (uint8) 
    {
        return finalResultIndex;
    }

    /// @notice Gets the final result name if the final result was set.
    /// @return The final result name.
    function getFinalResultName() 
        public 
        view
        resultIsSet
        returns (bytes32) 
    {
        return resultNames[finalResultIndex];
    }
 
    /// @dev Creates an Oracle for this Event.
    function createOracle() 
        private 
    {
        uint16 index = addressManager.getLastOracleFactoryIndex();
        address oracleFactory = addressManager.getOracleFactoryAddress(index);
        uint256 arbitrationBlockLength = uint256(addressManager.arbitrationBlockLength());
        address newOracle = IOracleFactory(oracleFactory).createOracle(name, resultNames, bettingEndBlock, 
            resultSettingEndBlock, block.number.add(arbitrationBlockLength));
        
        assert(newOracle != address(0));
        oracles.push(Oracle({
            oracleAddress: newOracle,
            didSetResult: false
            }));

        OracleCreated(newOracle);
    }
}
