pragma solidity ^0.4.15;

/// @title Base Oracle contract
contract Oracle {
    struct Participant {
        uint256 stakeContributed;
        bool didSetResult;
        uint8 resultIndex;
    }

    bytes32 public eventName;
    bytes32[] public eventResultNames;
    uint256 public eventBettingEndBlock;

    // Block number when Oracle staking ends
    uint256 public stakingEndBlock;

    // Block number when Oracle participants can no longer set decision
    uint256 public decisionEndBlock;

    uint256 public totalStakeContributed;
    uint16[] public votedResultCount;

    mapping(address => Participant) private participants;

    // Events
    event OracleCreated(bytes32 _eventName, bytes32[] _eventResultNames, uint256 _eventBettingEndBlock, 
        uint256 _stakingEndBlock, uint256 _decisionEndBlock);
    event StakeContributed(address _participant, uint256 _stakeContributed);
    event ParticipantVoted(address _participant, uint8 _resultIndex);

    // Modifiers
    modifier validResultIndex(uint _resultIndex) {
        require(_resultIndex >= 0);
        require(_resultIndex <= eventResultNames.length - 1);
        _;
    }

    modifier beforeStakingEndBlock() {
        require(block.number < stakingEndBlock);
        _;
    }

    modifier afterBettingEndBlock() {
        require(block.number >= eventBettingEndBlock);
        _;
    }

    modifier beforeDecisionEndBlock() {
        require(block.number < decisionEndBlock);
        _;
    }

    modifier afterDecisionEndBlock() {
        require(block.number >= decisionEndBlock);
        _;
    }

    modifier isParticipant() {
        require(participants[msg.sender].stakeContributed > 0);
        _;
    }

    function Oracle(
        bytes32 _eventName, 
        bytes32[] _eventResultNames, 
        uint256 _eventBettingEndBlock,
        uint256 _stakingEndBlock, 
        uint256 _decisionEndBlock) 
        public 
    {
        require(_eventName.length > 0);
        require(_eventResultNames.length > 1);
        require(_decisionEndBlock > _bettingEndBlock);

        name = _name;

        for (uint i = 0; i < _resultNames.length; i++) {
            resultNames.push(_resultNames[i]);
        }

        bettingEndBlock = _bettingEndBlock;
        stakingEndBlock = _stakingEndBlock;
        decisionEndBlock = _decisionEndBlock;

        OracleCreated(_eventName, _eventResultNames, _eventBettingEndBlock, _stakingEndBlock, _decisionEndBlock);
    }

    /// @notice Exchange BOT to get a stake in the Oracle and become an Oracle participant.
    function stakeOracle() 
        public 
        payable 
        beforeStakingEndBlock 
    {
        require(msg.value > 0);

        Participant storage participant = participants[msg.sender];
        participant.stakeContributed = participant.stakeContributed.add(msg.value);

        StakeContributed(msg.sender, participant.stakeContributed);
    }

    /// @notice Oracle participants can vote on the result before the decisionEndBlock.
    function voteResult(uint8 _eventResultIndex)
        public 
        isParticipant
        afterBettingEndBlock
        beforeDecisionEndBlock 
        validResultIndex
    {
        require(!participants[msg.sender].didSetResult);

        participants[msg.sender].resultIndex = _eventResultIndex;
        votedResultCount[_eventResultIndex] += 1;

        ParticipantVoted(msg.sender, _eventResultIndex);
    }

    /// @notice Gets the stake contributed by the Oracle participant.
    /// @return The amount of stake contributed by the Oracle participant.
    function getStakeContributed() 
        public 
        constant 
        returns(uint256) 
    {
        return participants[msg.sender].stakeContributed;
    }

    /// @notice Shows if the Oracle participant has voted yet.
    /// @return Flag that shows if the Oracle participant has voted yet.
    function didSetResult() 
        public 
        constant 
        returns(bool) 
    {
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
    function getFinalResultIndex() 
        public 
        afterDecisionEndBlock
        constant 
        returns (uint16) 
    {
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
