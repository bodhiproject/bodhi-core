pragma solidity ^0.4.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/EventCreator.sol";

contract TestEventCreator {
    EventCreator eventCreator;
    Topic testTopic;
    bytes32 testTopicName;
    bytes32[] testResultNames;
    uint256 testBettingEndBlock;

    function beforeEach() {
        testTopicName = "test";

        testResultNames = new bytes32[](3);
        testResultNames[0] = "first";
        testResultNames[1] = "second";
        testResultNames[2] = "third";

        testBettingEndBlock = 1000;

        eventCreator = EventCreator(DeployedAddresses.EventCreator());
        testTopic = eventCreator.createTopic(testTopicName, testResultNames, testBettingEndBlock);
    }

    function testOwnerIsSet() {
        Assert.equal(eventCreator.owner(), testTopic.owner(), "Owner's address does not match");
    }

    function testTopicNameIsSet() {
        Assert.equal(testTopic.name(), testTopicName, "Topic name does not match.");
    }

    function testResultNamesAreSet() {
        Assert.equal(testTopic.getResultName(0), testResultNames[0], "First result name does not match.");
        Assert.equal(testTopic.getResultName(1), testResultNames[1], "Second result name does not match.");
        Assert.equal(testTopic.getResultName(2), testResultNames[2], "Third result name does not match.");
    }

    function testBettingEndBlockIsSet() {
        Assert.equal(testTopic.bettingEndBlock(), testBettingEndBlock, "Betting end block does not match.");
    }

    function testOwnerCanSetFinalResult() {
        // Mock timestamp
        testTopic.setTesting(true);
        testTopic.setTime(10000);

        testTopic.revealResult(uint(1));
        Assert.equal(testTopic.getFinalResultIndex(), 1, "Final result index does not match.");
        Assert.equal(testTopic.getFinalResultName(), testResultNames[1], "Final result index does not match.");
    }
}
