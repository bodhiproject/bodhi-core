pragma solidity ^0.4.4;

import "./Topic.sol";

contract EventCreator {

    function EventCreator() {
    }
    
    function createEvent(string name, bytes32[] resultNames, uint256 bettingEndBlock)
        returns (Topic tokenAddress)
    {
        // Create a new Token contract and return its address.
        // From the JavaScript side, the return type is simply
        // "address", as this is the closest type available in
        // the ABI.
        return new Topic(name, resultNames, bettingEndBlock);
    }
}
