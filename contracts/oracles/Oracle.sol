pragma solidity ^0.4.15;

import "../libs/SafeMath.sol";

/// @title Base Oracle contract
contract Oracle {
    using SafeMath for uint256;

    struct Participant {
        uint256 stakeContributed;
        bool didSetResult;
        uint8 resultIndex;
    }

    // Number of decimals of token used to create Oracle
    uint256 public constant nativeDecimals = 18;

    // Number of decimals for BOT
    uint256 public constant botDecimals = 8;

    // Minimum amount needed to create Oracle
    uint256 public constant minReward = 1 * (10**nativeDecimals); 

    // Maximum amount of BOT staking contributions allowed
    uint256 public constant maxStakeContribution = 101 * (10**botDecimals);

    bytes32 public eventName;
    bytes32[] public eventResultNames;
    uint256 public eventBettingEndBlock;

    // Block number when Oracle participants can no longer set decision
    uint256 public decisionEndBlock;

    uint256 public totalStakeContributed;
    uint16[] public votedResultCount;

    mapping(address => Participant) private participants;

    // Events
    event OracleCreated(bytes32 _eventName, bytes32[] _eventResultNames, uint256 _eventBettingEndBlock, 
        uint256 _decisionEndBlock);
    event StakeContributed(address _participant, uint256 _stakeContributed);
    event ParticipantVoted(address _participant, uint8 _resultIndex);

    // Modifiers
    modifier isParticipant() {
        require(participants[msg.sender].stakeContributed > 0);
        _;
    }

    function Oracle(
        bytes32 _eventName, 
        bytes32[] _eventResultNames, 
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock) 
        public 
    {
        require(_eventName.length > 0);
        require(_eventResultNames.length > 1);
        require(_decisionEndBlock > _eventBettingEndBlock);

        eventName = _eventName;

        for (uint i = 0; i < _eventResultNames.length; i++) {
            eventResultNames.push(_eventResultNames[i]);
        }

        eventBettingEndBlock = _eventBettingEndBlock;
        decisionEndBlock = _decisionEndBlock;

        OracleCreated(_eventName, _eventResultNames, _eventBettingEndBlock, _decisionEndBlock);
    }

    /// @notice Exchange BOT to get a stake in the Oracle and become an Oracle participant.
    function stakeOracle() public payable {
        require(msg.value > 0);

        Participant storage participant = participants[msg.sender];
        participant.stakeContributed = participant.stakeContributed.add(msg.value);

        StakeContributed(msg.sender, participant.stakeContributed);
    }

    /// @notice Oracle participants can vote on the result before the decisionEndBlock.
    function voteResult(uint8 _eventResultIndex) public isParticipant {
        require(block.number >= eventBettingEndBlock);
        require(block.number < decisionEndBlock);
        require(_eventResultIndex >= 0);
        require(_eventResultIndex <= eventResultNames.length - 1);
        require(!participants[msg.sender].didSetResult);

        participants[msg.sender].resultIndex = _eventResultIndex;
        votedResultCount[_eventResultIndex] += 1;

        ParticipantVoted(msg.sender, _eventResultIndex);
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
    function getVotedResultIndex() 
        public 
        isParticipant 
        constant 
        returns(uint8) 
    {
        require(participants[msg.sender].didSetResult);
        return participants[msg.sender].resultIndex;
    }

    /// @notice Gets the final result index set by the Oracle participants.
    /// @return The index of the final result set by Oracle participants.
    function getFinalResultIndex() public constant returns (uint16) {
        require(block.number >= decisionEndBlock);

        uint16 finalResultIndex = 0;
        uint16 winningIndexCount = 0;
        for (uint16 i = 0; i < votedResultCount.length; i++) {
            if (votedResultCount[i] > winningIndexCount) {
                finalResultIndex = i;
            }
        }

        return finalResultIndex;
    }
}
