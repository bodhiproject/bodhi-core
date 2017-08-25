const EventCreator = artifacts.require("./EventCreator.sol");

contract('EventCreator', function(accounts) {
    let eventCreator;

    beforeEach(async () => {
        eventCreator = await EventCreator.deployed();
    })

    it('sets the first account as the contract creator', async function() {
        const event_creator = await EventCreator.deployed();
        bytes32[] resultNames = new bytes32[](3);
        resultNames[0] = "first";
        resultNames[1] = "second";
        resultNames[3] = "third";
        const event = await event_creator.createTopic('test', resultNames, 1000000);

        assert.equal(creator, accounts[0], 'main account is the creator')
    })
});
