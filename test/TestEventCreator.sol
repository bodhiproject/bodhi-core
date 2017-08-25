pragma solidity ^0.4.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/EventCreator.sol";

contract TestEventCreator {
    Topic testTopic;
    bytes32[] resultNames;

    function beforeEach() {
        resultNames = new bytes32[](3);
        resultNames.push("first");
        resultNames.push("second");
        resultNames.push("third");

        EventCreator eventCreator = EventCreator(DeployedAddresses.EventCreator());
        testTopic = eventCreator.createTopic("test", resultNames, 1000000);
    }

//    function testOwnerIsSet() {
//        Assert.equal(tx.origin, testTopic.owner, "Owner's address does not match");
//    }

//    function testResultNamesAreEqualLength() {
//        Assert.equal(testTopic.results.length, 3, "Result names length is not equal");
//    }

//    function testTopicNameIsSet() {
//        bytes32 topicName = bytes32(testTopic.getTopicName());
//        Assert.equal(topicName, "test", "Topic name does not match.");
//    }

    function testResultNamesAreSet() {
        Assert.equal(testTopic.getResultName(0), resultNames[0], "First result name does not match.");
        Assert.equal(testTopic.getResultName(1), resultNames[1], "Second result name does not match.");
        Assert.equal(testTopic.getResultName(2), resultNames[2], "Third result name does not match.");
    }
}
