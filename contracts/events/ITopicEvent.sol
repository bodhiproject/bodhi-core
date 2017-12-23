pragma solidity ^0.4.18;

contract ITopicEvent {
    function betFromOracle(address _better, uint8 _resultIndex) external payable;
    function centralizedOracleSetResult(address _oracle, uint8 _resultIndex, uint256 _consensusThreshold) external;
    function voteFromOracle(uint8 _resultIndex, address _sender, uint256 _amount) external returns (bool);
    function decentralizedOracleSetResult(uint8 _resultIndex, uint256 _currentConsensusThreshold) external returns (bool);
    function decentralizedOracleFinalizeResult() external returns (bool);
}
