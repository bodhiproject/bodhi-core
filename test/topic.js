const Topic = artifacts.require("./Topic.sol");

contract('Topic', function(accounts) {
	const testTopicParams = {
		_owner: accounts[0],
		_name: "test",
		_resultNames: ["first", "second", "third"],
		_bettingEndBlock: 1000
	};

	let testTopic;

	beforeEach(async function() {
   		testTopic = await Topic.new(...Object.values(testTopicParams));
	});

  	it("sets the first account as the contract creator", async function() {
		assert.equal(await testTopic.owner(), accounts[0], "Topic owner does not match.");
    });

    it("sets the topic name", async function() {
		assert.equal(await testTopic.name(), testTopicParams._name, "Topic name does not match.");
    });
});
