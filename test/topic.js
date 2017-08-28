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
  		testTopic.owner.call().then(function(owner) {
  			assert.equal(owner, accounts[0], "Topic owner does not match.");
  		});
    });

    it("sets the topic name correctly", async function() {
    	testTopic.name.call().then(function(name) {
    		assert.equal(web3.toUtf8(name), testTopicParams._name, "Topic name does not match.");
    	});
    });

    it("sets the topic result names correctly", async function() {
    	var resultNames = testTopicParams._resultNames;
		testTopic.getResultName(0).then(function(result1) {
			assert.equal(web3.toUtf8(result1), resultNames[0], "Result name 1 does not match.");
			return testTopic.getResultName(1);
		}).then(function(result2) {
			assert.equal(web3.toUtf8(result2), resultNames[1], "Result name 2 does not match.");
			return testTopic.getResultName(2);
		}).then(function(result3) {
			assert.equal(web3.toUtf8(result3), resultNames[2], "Result name 3 does not match.");
		});
    });

    it("sets the topic betting end block correctly", async function() {
    	testTopic.bettingEndBlock.call().then(function(bettingEndBlock) {
    		assert.equal(bettingEndBlock, testTopicParams._bettingEndBlock, "Topic betting end block does not match.");
    	});
    });

    // it("allows users to bet if before the betting end block has been reached", async function() {
    // 	console.log("balance: " + web3.eth.getBalance(accounts[1]));

    // 	var betAmount = web3.toWei(30, 'ether');
    // 	await testTopic.bet(0, { from: accounts[1], value: betAmount })
    // 	.then(function() {
    // 		console.log("then function hit");
    // 		console.log("after bet balance: " + web3.eth.getBalance(accounts[1]));

    // 		var results = await testTopic.results();
    // 		console.log("bet balance: " + results[0].betBalances(accounts[1]));
    // 	});
    // });
});
