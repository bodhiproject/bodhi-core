pragma solidity ^0.4.4;

import "./Event.sol";

contract EventCreator {

    function EventCreator() {
    }
    
    function createEvent(string name, string[] resultNames, uint256 bettingEndBlock)
       returns (Event tokenAddress)
    {
        // Create a new Token contract and return its address.
        // From the JavaScript side, the return type is simply
        // "address", as this is the closest type available in
        // the ABI.
        return new Event(name, resultNames, bettingEndBlock);
    }
}
