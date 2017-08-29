const web3 = global.web3;
const Topic = artifacts.require("./Topic.sol");
const assert = require('chai').assert;
const BlockHeightManager = require('./helpers/block_height_manager');

contract('Topic', function(accounts) {
	const blockHeightManager = new BlockHeightManager(web3);

	const testTopicParams = {
		_owner: accounts[0],
		_name: "test",
		_resultNames: ["first", "second", "third"],
		_bettingEndBlock: 1000
	};

	const increaseTime = function(seconds) {
		return new Promise((resolve, reject) => {
			web3.currentProvider.sendAsync({
				jsonrpc: "2.0",
				method: "evm_increaseTime",
				params: [seconds], // 86400 is num seconds in day
				id: new Date().getTime(),
			}, error1 => {
				if (error1) return reject(error1);
				
				web3.currentProvider.sendAsync({
        			jsonrpc: "2.0",
        			method: "evm_mine",
      			}, (error2, result2) => {
        			return error2 ? reject(error2) : resolve(result2);
      			});
		    });
		});
	};

	let testTopic;

	// Setup 
	beforeEach(async function() {
   		testTopic = await Topic.new(...Object.values(testTopicParams));
   		testTopic.allEvents().watch((error, response) => {
    		if (error) {
    			console.log("Event Error: " + error);
    		} else {
    			console.log("Event Triggered: " + JSON.stringify(response.event));
    			console.log("Args: " + JSON.stringify(response.args));
    		}
    	});
	});

  	it("sets the first account as the contract creator", async function() {
  		let owner = await testTopic.owner.call();
		assert.equal(owner, accounts[0], "Topic owner does not match.");
    });

    it("sets the topic name correctly", async function() {
    	let name = await testTopic.name.call();
    	assert.equal(web3.toUtf8(name), testTopicParams._name, "Topic name does not match.");
    });

    it("sets the topic result names correctly", async function() {
    	let resultName1 = await testTopic.getResultName(0);
    	assert.equal(web3.toUtf8(resultName1), testTopicParams._resultNames[0], "Result name 1 does not match.");

		let resultName2 = await testTopic.getResultName(1);
		assert.equal(web3.toUtf8(resultName2), testTopicParams._resultNames[1], "Result name 2 does not match.");

		let resultName3 = await testTopic.getResultName(2);
		assert.equal(web3.toUtf8(resultName3), testTopicParams._resultNames[2], "Result name 3 does not match.");
    });

    it("sets the topic betting end block correctly", async function() {
    	let bettingEndBlock = await testTopic.bettingEndBlock.call();
		await assert.equal(bettingEndBlock, testTopicParams._bettingEndBlock, "Topic betting end block does not match.");
    });

    it("allows users to bet if before the betting end block has been reached", async function() {
		let initialBalance = web3.eth.getBalance(testTopic.address).toNumber();
		let betAmount = web3.toWei(1, 'ether');
		let betResultIndex = 0;

		await testTopic.bet(betResultIndex, { from: accounts[1], value: betAmount })
		let newBalance = web3.eth.getBalance(testTopic.address).toNumber();
		let difference = newBalance - initialBalance;
		assert.equal(difference, betAmount, "New result balance does not match added bet.");

		let resultBalance = await testTopic.getResultBalance(betResultIndex);
		assert.equal(resultBalance, betAmount, "Result balance does not match.");

		let betBalance = await testTopic.getBetBalance(betResultIndex);
		assert.equal(betBalance.toString(), betAmount, "Bet balance does not match.");
    });
 
  //   it("does not allow users to bet if the betting end block has been reached", async function() {
  //   	var currentBlock = web3.eth.blockNumber;
  //   	console.log("current block: " + currentBlock);
  //   	await blockHeightManager.mineTo(1001);

  //   	currentBlock = web3.eth.blockNumber;
  //   	console.log("after advancing block: " + currentBlock);	

  //   	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

		// let betAmount = web3.toWei(1, 'ether');
		// let betResultIndex = 0;
        	
		// assert(testTopic.bet(betResultIndex, { from: accounts[1], value: betAmount }))
		// .to.fail("Betting past betting end block did not fail as expected.");

		// try {
	 //        testTopic.bet(betResultIndex, { from: accounts[1], value: betAmount })
	 //        assert.fail();
		// } catch(e) {
	 //        assert.match(e.toString(), /invalid opcode/);
	 //    }
  //   });
});
