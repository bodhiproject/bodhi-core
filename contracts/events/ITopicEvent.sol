pragma solidity ^0.4.18;

contract ITopicEvent {
    function bet(address _better, uint8 _resultIndex) external payable;
    function centralizedOracleSetResult(uint8 _resultIndex, uint256 _botAmount, uint256 _consensusThreshold) external;
    function invalidateCentralizedOracle(uint8 _resultIndex) external;
    function voteFromOracle(uint8 _resultIndex, address _sender, uint256 _amount) external returns (bool);
    function votingOracleSetResult(uint8 _resultIndex, uint256 _currentConsensusThreshold) external returns (bool);
    function finalizeResult() external returns (bool);
}
