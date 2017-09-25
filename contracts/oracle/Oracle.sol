pragma solidity ^0.4.15;

/// @title Base Oracle contract
contract Oracle {
    struct Participant {
        uint256 stakeContributed;
        bool didSetResult;
        uint resultIndex;
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
    event OracleParticipantVoted(uint _resultIndex, uint16 _totalResultIndexVotes);

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
    }

    /// @notice Oracle participants can vote on the result before the decisionEndBlock
    function voteResult(uint _eventResultIndex) 
        public 
        isParticipant
        afterBettingEndBlock
        beforeDecisionEndBlock 
        validResultIndex
    {
        require(!participants[msg.sender].didSetResult);

        participants[msg.sender].resultIndex = _eventResultIndex;
        votedResultCount[_eventResultIndex] += 1;

        OracleParticipantVoted(_eventResultIndex, votedResultCount[_eventResultIndex]);
    }

    /// @notice Gets the final result index set by Oracle.
    /// @return The index of the final result set by Oracle.
    function getOracleResultIndex() public constant returns (uint) {
        return finalResultIndex;
    }
}
