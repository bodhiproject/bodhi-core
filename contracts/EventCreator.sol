pragma solidity ^0.4.4;

import "./Topic.sol";

contract EventCreator {

    function EventCreator() {
    }
    
    function createTopic(string name, bytes32[] resultNames, uint256 bettingEndBlock)
        returns (Topic tokenAddress)
    {
        return new Topic(msg.sender, name, resultNames, bettingEndBlock);
    }
}
