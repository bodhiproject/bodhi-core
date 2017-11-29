pragma solidity ^0.4.18;

contract ITopicEvent {
    function transferBot(address _sender, uint256 _amount) external returns (bool);
    function votingOracleSetResult(uint8 _resultIndex, uint256 _currentConsensusThreshold) external returns (bool);
    function finalizeResult() external returns (bool);
}
