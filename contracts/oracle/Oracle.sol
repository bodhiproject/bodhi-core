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

    // Modifiers
    modifier beforeStakingEndBlock() {
        require(block.number < stakingEndBlock);
        _;
    }

    modifier beforeDecisionEndBlock() {
        require(block.number < decisionEndBlock);
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

    /// @dev Abstract function that Oracles should implement. Should check if _finalResultIndex is valid.
    function setFinalResult(uint _finalResultIndex) public;

    /// @notice Check to see if the Oracle has set the final result.
    /// @return Boolean if final result is set by Oracle.
    function isFinalResultSet() public constant returns (bool) {
        return finalResultSet;
    }

    /// @notice Gets the final result index set by Oracle.
    /// @return The index of the final result set by Oracle.
    function getFinalResultIndex() public constant returns (uint) {
        return finalResultIndex;
    }
}
