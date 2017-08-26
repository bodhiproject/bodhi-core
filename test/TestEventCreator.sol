pragma solidity ^0.4.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/EventCreator.sol";

contract TestEventCreator {
    EventCreator eventCreator;
    Topic testTopic;
    bytes32 testTopicName;
    bytes32[] resultNames;

    function beforeEach() {
        testTopicName = "test";

        resultNames = new bytes32[](3);
        resultNames[0] = "first";
        resultNames[1] = "second";
        resultNames[2] = "third";

        eventCreator = EventCreator(DeployedAddresses.EventCreator());
        testTopic = eventCreator.createTopic(testTopicName, resultNames, 1000000);
    }

    function testOwnerIsSet() {
//        EventCreator ec = EventCreator(DeployedAddresses.EventCreator());
//        Topic topic = eventCreator.createTopic("test", resultNames, 1000000);
        address eventCreatorOwner = eventCreator.owner();
        address testTopicOwner = testTopic.owner();
        Assert.equal(eventCreatorOwner, testTopicOwner, "Owner's address does not match");
    }

    function testTopicNameIsSet() {
        Assert.equal(testTopic.name(), testTopicName, "Topic name does not match.");
    }

    function testResultNamesAreSet() {
        Assert.equal(testTopic.getResultName(0), resultNames[0], "First result name does not match.");
        Assert.equal(testTopic.getResultName(1), resultNames[1], "Second result name does not match.");
        Assert.equal(testTopic.getResultName(2), resultNames[2], "Third result name does not match.");
    }
}
