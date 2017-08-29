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

    it("allows users to bet if before the betting end block has been reached", async function() {
    	// TODO: Remove after testing done
    	testTopic.allEvents().watch((error, response) => {
    		if (error) {
    			console.log("Error: " + error);
    		} else {
    			console.log("BetAccepted better: " + response.args._better);
    			console.log("BetAccepted resultIndex: " + response.args._resultIndex);
    			console.log("BetAccepted betAmount: " + response.args._betAmount);
    			console.log("BetAccepted betBalance: " + response.args._betBalance);
    		}
    	});

		let initialBalance = web3.eth.getBalance(testTopic.address).toNumber();
		let betAmount = web3.toWei(1, 'ether');
		let betResultIndex = 0;

		testTopic.bet(betResultIndex, { from: accounts[1], value: betAmount }).then(function() {
			let newBalance = web3.eth.getBalance(testTopic.address).toNumber();
			let difference = newBalance - initialBalance;
			assert.equal(difference, betAmount, "New result balance does not match added bet.");

			return testTopic.getResultBalance(betResultIndex);
		}).then(function(resultBalance) {
			assert.equal(resultBalance, betAmount, "Result balance does not match.");
			return testTopic.getBetBalance(betResultIndex);
		}).then(function(betBalance) {
			assert.equal(betBalance.toString(), betAmount, "Bet balance does not match.");
		});
    });
});
