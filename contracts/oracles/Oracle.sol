pragma solidity ^0.4.18;

import "../events/ITopicEvent.sol";
import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";
import "../libs/ByteUtils.sol";

/// @title Base Oracle contract
contract Oracle is Ownable {
    using ByteUtils for bytes32;
    using SafeMath for uint256;

    struct ResultBalance {
        uint256 totalVoteBalance;
        mapping(address => uint256) voteBalances;
    }

    bool public isFinished;
    uint8 public lastResultIndex;
    uint8 public numOfResults;
    bytes32[10] private eventName;
    bytes32[10] public eventResultNames;
    address public eventAddress;
    uint256 public arbitrationEndBlock;
    uint256 public consensusThreshold;
    uint256 public totalStakeContributed;
    ResultBalance[10] private resultBalances;

    // Modifiers
    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }

    modifier isNotFinished() {
        require(!isFinished);
        _;
    }

    // Events
    event OracleResultVoted(address indexed _participant, uint8 _resultIndex, uint256 _votedAmount);
    event OracleResultSet(uint8 _resultIndex);

    /*
    * @notice Creates new Oracle contract.
    * @param _owner The address of the owner.
    * @param _eventAddress The address of the Event this Oracle will arbitrate.
    * @param _eventName The name of the Event this Oracle will arbitrate.
    * @param _eventResultNames The result options of the Event.
    * @param _lastResultIndex The last result index set by the Oracle.
    * @param _arbitrationEndBlock The max block of this arbitration that voting will be allowed.
    * @param _consensusThreshold The amount of BOT that needs to be reached in order for this Oracle to be valid.
    */
    function Oracle(
        address _owner,
        address _eventAddress,
        bytes32[10] _eventName,
        bytes32[10] _eventResultNames,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold)
        Ownable(_owner)
        public
        validAddress(_eventAddress)
    {
        require(!_eventName[0].isEmpty());
        require(!_eventResultNames[0].isEmpty());
        require(!_eventResultNames[1].isEmpty());
        require(_lastResultIndex <= 9);
        require(_arbitrationEndBlock > block.number);
        require(_consensusThreshold > 0);

        eventAddress = _eventAddress;
        eventName = _eventName;
        eventResultNames = _eventResultNames;

        for (uint i = 0; i < _eventResultNames.length; i++) {
            if (!_eventResultNames[i].isEmpty()) {
                numOfResults++;
            } else {
                break;
            }
        }

        lastResultIndex = _lastResultIndex;
        arbitrationEndBlock = _arbitrationEndBlock;
        consensusThreshold = _consensusThreshold;
    }

    /*
    * @notice Vote on an Event result which requires BOT payment.
    * @param _eventResultIndex The Event result which is being voted on.
    * @param _botAmount The amount of BOT used to vote.
    */
    function voteResult(uint8 _eventResultIndex, uint256 _botAmount) 
        external 
        validResultIndex(_eventResultIndex) 
        isNotFinished()
    {
        require(_botAmount > 0);
        require(block.number < arbitrationEndBlock);
        require(_eventResultIndex != lastResultIndex);

        ResultBalance storage resultBalance = resultBalances[_eventResultIndex];
        resultBalance.totalVoteBalance = resultBalance.totalVoteBalance.add(_botAmount);
        resultBalance.voteBalances[msg.sender] = resultBalance.voteBalances[msg.sender].add(_botAmount);

        totalStakeContributed = totalStakeContributed.add(_botAmount);

        ITopicEvent(eventAddress).voteFromOracle(_eventResultIndex, msg.sender, _botAmount);
        OracleResultVoted(msg.sender, _eventResultIndex, _botAmount);

        if (resultBalance.totalVoteBalance >= consensusThreshold) {
            setResult();
        }
    }

    /*
    * @notice This can be called by anyone if this VotingOracle did not meet the consensus threshold and has reached 
    *   the arbitration end block. This finishes the Event and allows winners to withdraw their winnings from the Event 
    *   contract.
    * @return Flag to indicate success of finalizing the result.
    */
    function finalizeResult() 
        external 
        isNotFinished()
    {
        require(block.number >= arbitrationEndBlock);

        isFinished = true;

        ITopicEvent(eventAddress).finalizeResult();
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
        return ByteUtils.toString(eventName);
    }

    /*
    * @notice Gets the BOT amount voted by the Oracle participant given the event result index.
    * @return The amount of BOT voted.
    */
    function getVotedBalance(uint8 _eventResultIndex) 
        public 
        view 
        validResultIndex(_eventResultIndex)
        returns (uint256)
    {
        return resultBalances[_eventResultIndex].voteBalances[msg.sender];
    }

    /*
    * @notice Gets the final result index set by the Oracle participants based on majority vote.
    * @return The index of the final result.
    */
    function getFinalResultIndex() 
        public 
        view 
        returns (uint8) 
    {
        require(isFinished);

        uint8 finalResultIndex = 0;
        uint256 winningVoteBalance = 0;
        for (uint8 i = 0; i < numOfResults; i++) {
            uint256 totalVoteBalance = resultBalances[i].totalVoteBalance;
            if (totalVoteBalance > winningVoteBalance) {
                winningVoteBalance = totalVoteBalance;
                finalResultIndex = i;
            }
        }

        return finalResultIndex;
    }

    /*
    * @dev Sets the result in the Event.
    */
    function setResult() 
        private 
    {
        isFinished = true;

        uint8 finalResultIndex = getFinalResultIndex();
        ITopicEvent(eventAddress).votingOracleSetResult(finalResultIndex, totalStakeContributed);
        OracleResultSet(finalResultIndex);
    }
}
