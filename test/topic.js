const web3 = global.web3;
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

    it("sets the topic name correctly", async function() {
		assert.equal(web3.toUtf8(await testTopic.name()), testTopicParams._name, "Topic name does not match.");
    });

    it("sets the topic result names correctly", async function() {
    	var resultNames = testTopicParams._resultNames;
		assert.equal(web3.toUtf8(await testTopic.getResultName(0)), resultNames[0], "Result name 1 does not match.");
		assert.equal(web3.toUtf8(await testTopic.getResultName(1)), resultNames[1], "Result name 2 does not match.");
		assert.equal(web3.toUtf8(await testTopic.getResultName(2)), resultNames[2], "Result name 3 does not match.");
    });

    it("sets the topic betting end block correctly", async function() {
		assert.equal(await testTopic.bettingEndBlock(), testTopicParams._bettingEndBlock, "Topic betting end block does not match.");
    });
});
