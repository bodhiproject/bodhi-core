const EventCreator = artifacts.require("./EventCreator.sol");

contract('EventCreator', function(accounts) {
	// const testTopicParams = {
	// 	_name: "test",
	// 	_resultNames: ["first", "second", "third"],
	// 	_bettingEndBlock: 1000
	// };

	// let eventCreator;
	// let testTopic;

	// beforeEach(async function() {
 //   		eventCreator = await EventCreator.new();
 //   		testTopic = await eventCreator.createTopic(...Object.values(testTopicParams));
	// });

	// it('sets the first account as the contract creator', async function() {
	// 	assert.equal(await testTopic.owner, accounts[0], 'main account is the creator');
	// });

	// it('should be able to query the topics result names', async function() {
	// 	var resultName1 = testTopic.results[0].name;
	// 	assert.equal(resultName1, "first", "first result name is correct")
	// 	assert.equal(testTopic.results[1].name, "second", "second result name is correct")
	// 	assert.equal(testTopic.results[2].name, "third", "third result name is correct")
	// });
});
