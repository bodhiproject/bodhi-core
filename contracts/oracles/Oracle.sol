pragma solidity ^0.4.15;

import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";

/// @title Base Oracle contract
contract Oracle is Ownable {
    using SafeMath for uint256;

    struct Participant {
        uint256 stakeContributed;
        bool didSetResult;
        uint8 resultIndex;
        bool didWithdrawEarnings;
    }

    struct Result {
        bytes32 name;
        uint256 votedBalance;
    }

    uint256 public constant nativeDecimals = 18; // Number of decimals of token used to create Oracle
    uint256 public constant botDecimals = 8; // Number of decimals for BOT
    uint256 public constant minBaseReward = 1 * (10**nativeDecimals); // Minimum amount needed to create Oracle
    uint256 public constant maxStakeContribution = 101 * (10**botDecimals); // Maximum amount of BOT staking contributions allowed

    bytes public eventName;
    uint256 public eventBettingEndBlock;
    uint256 public decisionEndBlock; // Block number when Oracle participants can no longer set a result
    uint256 public arbitrationOptionEndBlock; // Block number when Oracle participants can no longer start arbitration
    uint256 public totalStakeContributed;

    Result[] private eventResults;
    mapping(address => Participant) private participants;

    // Modifiers
    modifier validResultIndex(uint _resultIndex) {
        require(_resultIndex >= 0);
        require(_resultIndex <= eventResults.length - 1);
        _;
    }

    // Events
    event OracleCreated(bytes _eventName, bytes32[] _eventResultNames, uint256 _eventBettingEndBlock, 
        uint256 _decisionEndBlock, uint256 _arbitrationOptionEndBlock);
    event OracleFunded(uint256 _baseRewardAmount);
    event ParticipantVoted(address _participant, uint256 _stakeContributed, uint8 _resultIndex);
    event EarningsWithdrawn(uint256 _amountWithdrawn);

    /// @notice Creates new Oracle contract. Requires payment of the minBaseReward. 
    /// @param _eventName The name of the Event this Oracle will arbitrate.
    /// @param _eventResultNames The result options of the Event.
    /// @param _eventBettingEndBlock The block when Event betting ended.
    /// @param _decisionEndBlock The block when Oracle voting will end.
    /// @param _arbitrationOptionEndBlock The block when the option to start an arbitration will end.
    function Oracle(
        bytes _eventName, 
        bytes32[] _eventResultNames, 
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock) 
        public
    {
        require(_eventName.length > 0);
        require(_eventResultNames.length > 1);
        require(_decisionEndBlock > _eventBettingEndBlock);
        require(_arbitrationOptionEndBlock > _decisionEndBlock);

        eventName = _eventName;

        for (uint i = 0; i < _eventResultNames.length; i++) {
            eventResults.push(Result({
                name: _eventResultNames[i],
                votedBalance: 0
            }));
        }

        eventBettingEndBlock = _eventBettingEndBlock;
        decisionEndBlock = _decisionEndBlock;
        arbitrationOptionEndBlock = _arbitrationOptionEndBlock;

        OracleCreated(_eventName, _eventResultNames, _eventBettingEndBlock, _decisionEndBlock, 
            arbitrationOptionEndBlock);
    }

    function() external payable {
        this.addBaseReward.value(msg.value)();
    }

    function addBaseReward() external payable onlyOwner {
        require(msg.value >= minBaseReward);
        OracleFunded(msg.value);
    }

    /// @notice Vote an Event result which requires BOT payment.
    /// @param _eventResultIndex The Event result which is being voted on.
    function voteResult(uint8 _eventResultIndex) 
        public 
        payable 
        validResultIndex(_eventResultIndex) 
    {
        require(msg.value > 0);
        require(block.number >= eventBettingEndBlock);
        require(block.number < decisionEndBlock);
        require(!participants[msg.sender].didSetResult);

        Participant storage participant = participants[msg.sender];
        participant.stakeContributed = participant.stakeContributed.add(msg.value);
        participant.resultIndex = _eventResultIndex;
        participant.didSetResult = true;

        eventResults[_eventResultIndex].votedBalance = eventResults[_eventResultIndex].votedBalance.add(msg.value);
        totalStakeContributed = totalStakeContributed.add(msg.value);

        ParticipantVoted(msg.sender, msg.value, _eventResultIndex);
    }

    /// @notice Withdraw earnings if you picked the correct result.
    function withdrawEarnings() public {
        require(block.number >= arbitrationOptionEndBlock);
        require(participants[msg.sender].stakeContributed > 0);
        require(totalStakeContributed > 0);
        require(!participants[msg.sender].didWithdrawEarnings);

        uint256 withdrawAmount = getEarningsAmount();
        participants[msg.sender].didWithdrawEarnings = true;

        require(withdrawAmount > 0);
        msg.sender.transfer(withdrawAmount);

        EarningsWithdrawn(withdrawAmount);
    }

    /// @notice Gets the Event result name given a valid index.
    /// @param _eventResultIndex The index of the wanted result name.
    /// @return The name of the Event result.
    function getEventResultName(uint8 _eventResultIndex) 
        public 
        validResultIndex(_eventResultIndex) 
        constant 
        returns (bytes32) 
    {
        return eventResults[_eventResultIndex].name;
    }

    /// @notice Gets the number of blocks allowed for arbitration.
    /// @param _averageBlockTime The current average mining block time.
    /// @param _arbitrationOptionMinutes The number of minutes allowed for initiating arbitration.
    function getArbitrationOptionBlocks(
        uint8 _averageBlockTime, 
        uint256 _arbitrationOptionMinutes) 
        public 
        constant 
        returns(uint256) 
    {
        return _arbitrationOptionMinutes.div(uint256(_averageBlockTime));
    }

    /// @notice Gets the stake contributed by the Oracle participant.
    /// @return The amount of stake contributed by the Oracle participant.
    function getStakeContributed() public constant returns(uint256) {
        return participants[msg.sender].stakeContributed;
    }

    /// @notice Shows if the Oracle participant has voted yet.
    /// @return Flag that shows if the Oracle participant has voted yet.
    function didSetResult() public constant returns(bool) {
        return participants[msg.sender].didSetResult;
    }

    /// @notice Gets the result index the Oracle participant previously voted on.
    /// @return The voted result index.
    function getVotedResultIndex() public constant returns(uint8) {
        require(participants[msg.sender].didSetResult);
        return participants[msg.sender].resultIndex;
    }

    /// @notice Gets the final result index set by the Oracle participants.
    /// @return The index of the final result set by Oracle participants.
    function getFinalResultIndex() public constant returns (uint8) {
        require(block.number >= decisionEndBlock);

        uint8 finalResultIndex = 0;
        uint256 winningIndexAmount = 0;
        for (uint8 i = 0; i < eventResults.length; i++) {
            uint256 votedBalance = eventResults[i].votedBalance;
            if (votedBalance > winningIndexAmount) {
                winningIndexAmount = votedBalance;
                finalResultIndex = i;
            }
        }

        return finalResultIndex;
    }

    /// @notice Gets the amount of earnings you can withdraw.
    /// @return The amount of earnings you can withdraw.
    function getEarningsAmount() public constant returns(uint256) {
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

        uint256 winningResultContributions = eventResults[finalResultIndex].votedBalance;
        uint256 losingResultContributions = totalStakeContributed.sub(winningResultContributions);
        return stakeContributed.mul(losingResultContributions).div(winningResultContributions).add(stakeContributed);
    }
}
