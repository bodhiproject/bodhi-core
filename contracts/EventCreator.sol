pragma solidity ^0.4.11;

import "./Topic.sol";

contract EventCreator {

    address public owner;

    function EventCreator() {
        owner = msg.sender;
    }
    
    function createTopic(bytes32 name, bytes32[] resultNames, uint256 bettingEndBlock)
        returns (Topic tokenAddress)
    {
        return new Topic(owner, name, resultNames, bettingEndBlock);
    }
}
