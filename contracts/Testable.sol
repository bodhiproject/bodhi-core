pragma solidity ^0.4.4;

contract Testable {
    bool testing;
    uint currentTimestamp;

    function Testable() {

    }

    function setTesting(bool _testing) {
        testing = _testing;
    }

    function setTime(uint _timestamp) {
        require(testing);
        currentTimestamp = _timestamp;
    }

    function currentTime() returns (uint) {
        return testing ? currentTimestamp : block.timestamp;
    }
}
