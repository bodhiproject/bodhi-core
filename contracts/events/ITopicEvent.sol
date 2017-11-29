pragma solidity ^0.4.18;

contract ITopicEvent {
    function transferBot(address _sender, uint256 _amount) external returns (bool);
    function finalizeResult() public returns (bool);
}
