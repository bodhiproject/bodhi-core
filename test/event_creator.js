const EventCreator = artifacts.require("./EventCreator.sol");

contract('EventCreator', function(accounts) {
    let eventCreator;
    let testTopic;

    beforeEach(async () => {
        eventCreator = await EventCreator.deployed();

        bytes32[] resultNames = new bytes32[](3);
        resultNames[0] = "first";
        resultNames[1] = "second";
        resultNames[3] = "third";

        testTopic = await eventCreator.createTopic('test', resultNames, 1000000);
    })

    it('sets the first account as the contract creator', async function() {
        assert.equal(testTopic.owner, accounts[0], 'main account is the creator')
    })
});
