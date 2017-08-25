const EventCreator = artifacts.require("./EventCreator.sol");

contract('EventCreator', function(accounts) {
  it("should assert true", function(done) {
    var event_creator = EventCreator.deployed();
    assert.isTrue(true);
    done();
  });

  it('sets the first account as the contract creator', async function() {
    const event_creator = await EventCreator.deployed();
    const event = await event_creator.createEvent('test', 'first', 'second', 1000000);

    assert.equal(creator, accounts[0], 'main account is the creator')
  })
});
