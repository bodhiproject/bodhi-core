pragma solidity ^0.4.15;

/// @title Base Oracle contract
contract Oracle {
    struct Participant {
        uint256 stakeContributed;
        bool didSetResult;
        uint resultIndex;
    }

    // Block number when Oracle staking ends
    uint256 public stakingEndBlock;

    // Block number when Event betting ends
    uint256 public bettingEndBlock;

    // Block number when Oracle participants can no longer set decision
    uint256 public decisionEndBlock;

    bool public finalResultSet;
    uint public finalResultIndex;

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
        uint256 _stakingEndBlock, 
        uint256 _bettingEndBlock, 
        uint256 _decisionEndBlock) 
        public 
    {
        stakingEndBlock = _stakingEndBlock;
        bettingEndBlock = _bettingEndBlock;
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
