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

    it('should be able to query the topics result names', async function() {
        assert.equal(testTopic.results[0].name, "first", "first result name is correct")
        assert.equal(testTopic.results[1].name, "second", "second result name is correct")
        assert.equal(testTopic.results[2].name, "third", "third result name is correct")
    })
});
