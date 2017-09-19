pragma solidity ^0.4.11;

import "./Topic.sol";

/// @title Event Factory contract - allows creation of individual prediction events
contract EventFactory {
    
    function createTopic(bytes32 name, bytes32[] resultNames, uint256 bettingEndBlock)
        returns (Topic tokenAddress)
    {
        return new Topic(msg.sender, name, resultNames, bettingEndBlock);
    }
}
