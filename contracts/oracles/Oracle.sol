pragma solidity ^0.4.18;

import "../events/ITopicEvent.sol";
import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";
import "../libs/ByteUtils.sol";
import "../storage/IAddressManager.sol";

/// @title Base Oracle contract
contract Oracle is Ownable {
    using ByteUtils for bytes32;
    using SafeMath for uint256;

    struct Participant {
        bool didSetResult;
        bool didWithdrawEarnings;
        uint8 resultIndex;
        uint256 stakeContributed;
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
    uint256[10] private resultBalances;
    IAddressManager private addressManager;
    mapping(address => Participant) private participants;

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

    /// @notice Creates new Oracle contract.
    /// @param _owner The address of the owner.
    /// @param _eventAddress The address of the Event this Oracle will arbitrate.
    /// @param _eventName The name of the Event this Oracle will arbitrate.
    /// @param _eventResultNames The result options of the Event.
    /// @param _lastResultIndex The last result index set by the Oracle.
    /// @param _arbitrationEndBlock The max block of this arbitration that voting will be allowed.
    /// @param _consensusThreshold The amount of BOT that needs to be reached in order for this Oracle to be valid.
    /// @param _addressManager The address of the AddressManager contract.
    function Oracle(
        address _owner,
        address _eventAddress,
        bytes32[10] _eventName,
        bytes32[10] _eventResultNames,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold,
        address _addressManager)
        Ownable(_owner)
        public
        validAddress(_eventAddress)
        validAddress(_addressManager)
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

        addressManager = IAddressManager(_addressManager);
    }

    /// @notice Vote on an Event Result which requires BOT payment.
    /// @param _eventResultIndex The Event Result which is being voted on.
    /// @param _botAmount The amount of BOT used to vote.
    function voteResult(uint8 _eventResultIndex, uint256 _botAmount) 
        external 
        validResultIndex(_eventResultIndex) 
        isNotFinished()
    {
        require(_botAmount > 0);
        require(!participants[msg.sender].didSetResult);
        require(block.number < arbitrationEndBlock);
        require(_eventResultIndex != lastResultIndex);

        Participant storage participant = participants[msg.sender];
        participant.didSetResult = true;
        participant.resultIndex = _eventResultIndex;
        participant.stakeContributed = _botAmount;

        resultBalances[_eventResultIndex] = resultBalances[_eventResultIndex].add(_botAmount);
        totalStakeContributed = totalStakeContributed.add(_botAmount);

        if (!ITopicEvent(eventAddress).transferBot(msg.sender, _botAmount)) {
            revert();
        }

        OracleResultVoted(msg.sender, _eventResultIndex, _botAmount);

        if (totalStakeContributed >= consensusThreshold) {
            setResult();
        }
    }

    /*
    * @notice This can be called by anyone if this VotingOracle did not meet the consensus threshold and has reached 
    *   the arbitration end block.
    * @return Flag to indicate success of finalizing the result.
    */
    function finalizeResult() 
        external 
        isNotFinished()
    {
        require(totalStakeContributed < consensusThreshold);
        require(block.number >= arbitrationEndBlock);

        isFinished = true;

        if (!ITopicEvent(eventAddress).finalizeResult()) {
            revert();
        }
    }

    /// @notice Gets the Event name as a string.
    /// @return The name of the Event.
    function getEventName() 
        public 
        view 
        returns (string) 
    {
        return ByteUtils.toString(eventName);
    }

    /// @notice Gets the stake contributed by the Oracle participant.
    /// @return The amount of stake contributed by the Oracle participant.
    function getStakeContributed() 
        public 
        view 
        returns(uint256) 
    {
        return participants[msg.sender].stakeContributed;
    }

    /// @notice Shows if the Oracle participant has voted yet.
    /// @return Flag that shows if the Oracle participant has voted yet.
    function didSetResult() 
        public 
        view 
        returns(bool) 
    {
        return participants[msg.sender].didSetResult;
    }

    /// @notice Gets the result index the Oracle participant previously voted on.
    /// @return The voted result index.
    function getVotedResultIndex() 
        public 
        view 
        returns(uint8) 
    {
        require(participants[msg.sender].didSetResult);
        return participants[msg.sender].resultIndex;
    }

    /// @notice Gets the final result index set by the Oracle participants.
    /// @return The index of the final result set by Oracle participants.
    function getFinalResultIndex() 
        public 
        view 
        returns (uint8) 
    {
        uint8 finalResultIndex = 0;
        uint256 winningIndexAmount = 0;
        for (uint8 i = 0; i < resultBalances.length; i++) {
            uint256 resultBalance = resultBalances[i];
            if (resultBalance > winningIndexAmount) {
                winningIndexAmount = resultBalance;
                finalResultIndex = i;
            }
        }

        return finalResultIndex;
    }

    /// @notice Gets the amount of earnings you can withdraw.
    /// @return The amount of earnings you can withdraw.
    function getEarningsAmount() 
        public 
        view 
        returns(uint256) 
    {
        uint256 stakeContributed = participants[msg.sender].stakeContributed;
        if (stakeContributed == 0) {
            return 0;
        }

        if (!participants[msg.sender].didSetResult) {
            return 0;
        }

        if (participants[msg.sender].didWithdrawEarnings) {
            return 0;
        }

        uint8 finalResultIndex = getFinalResultIndex();
        if (participants[msg.sender].resultIndex != finalResultIndex) {
            return 0;
        }

        uint256 winningResultContributions = resultBalances[finalResultIndex];
        uint256 losingResultContributions = totalStakeContributed.sub(winningResultContributions);
        return stakeContributed.mul(losingResultContributions).div(winningResultContributions).add(stakeContributed);
    }

    function setResult() 
        private 
    {
        isFinished = true;

        if (!ITopicEvent(eventAddress).votingOracleSetResult(getFinalResultIndex(), totalStakeContributed)) {
            revert();
        }

        OracleResultSet(_eventResultIndex);
    }
}
