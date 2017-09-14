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
		_bettingEndBlock: 500
	};

	let testTopic;
	let testSafeMath;

	beforeEach(blockHeightManager.snapshot);
  	afterEach(blockHeightManager.revert);

  	describe("New Topic:", async function() {
  		before(async function() {
			testTopic = await Topic.new(...Object.values(testTopicParams));
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
  	});

  	describe("Betting:", async function() {
  		it("allows users to bet if the betting end block has not been reached", async function() {
			testTopic = await Topic.new(...Object.values(testTopicParams));

			let watcher = testTopic.BetAccepted().watch((error, response) => {
	    		if (error) {
	    			console.log("Event Error: " + error);
	    		} else {
	    			console.log("Event Triggered: " + JSON.stringify(response.event));
	    			console.log("resultIndex: " + JSON.stringify(response.args._resultIndex));
	    			console.log("betAmount: " + JSON.stringify(response.args._betAmount));
	    			console.log("betBalance: " + JSON.stringify(response.args._betBalance));
	    		}
	    	});

			let initialBalance = web3.eth.getBalance(testTopic.address).toNumber();
			let betAmount = web3.toWei(1, 'ether');
			let betResultIndex = 0;

			await testTopic.bet(betResultIndex, { from: accounts[1], value: betAmount });
			let newBalance = web3.eth.getBalance(testTopic.address).toNumber();
			let difference = newBalance - initialBalance;
			assert.equal(difference, betAmount, "New result balance does not match added bet.");

			let resultBalance = await testTopic.getResultBalance(betResultIndex);
			assert.equal(resultBalance, betAmount, "Result balance does not match.");

			let betBalance = await testTopic.getBetBalance(betResultIndex, { from: accounts[1] });
			assert.equal(betBalance.toString(), betAmount, "Bet balance does not match.");

			watcher.stopWatching();
	    });
	 
	    it("does not allow users to bet if the betting end block has been reached", async function() {
	    	testTopic = await Topic.new(...Object.values(testTopicParams));

	    	await blockHeightManager.mineTo(500);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

			let betAmount = web3.toWei(1, 'ether');
			let betResultIndex = 0;

			try {
		        await testTopic.bet(betResultIndex, { from: accounts[1], value: betAmount })
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
	    });
  	});

    describe("Revealing Results:", async function() {
    	it("allows the owner to reveal the result if the betting end block has been reached", async function() {
	    	testTopic = await Topic.new(...Object.values(testTopicParams));

	    	await blockHeightManager.mineTo(500);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

	    	var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");

	    	let testFinalResultIndex = 2;
	    	await testTopic.revealResult(testFinalResultIndex);

	    	finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isTrue(finalResultSet, "Final result should be set.");

	    	let finalResultIndex = await testTopic.getFinalResultIndex();
	    	assert.equal(finalResultIndex, testFinalResultIndex, "Final result index does not match.");

	    	let finalResultName = await testTopic.getFinalResultName();
	    	assert.equal(web3.toUtf8(finalResultName), testTopicParams._resultNames[testFinalResultIndex], "Final result index does not match.");
	    });

	    it("does not allow the owner to reveal the result if the betting end block has not been reached", async function() {
	    	testTopic = await Topic.new(...Object.values(testTopicParams));

	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isBelow(currentBlock, testTopicParams._bettingEndBlock);

	    	var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");
	    	
	    	try {
	    		let testFinalResultIndex = 2;
		        await testTopic.revealResult(testFinalResultIndex);
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
	    });
    });

    describe("Withdrawing:", async function() {
    	it("allows the better to withdraw their winnings if it has ended and the result was revealed", async function() {
    		testTopic = await Topic.new(...Object.values(testTopicParams));

    		// let watcher = testTopic.BetAccepted().watch((error, response) => {
	    	// 	if (error) {
	    	// 		console.log("Event Error: " + error);
	    	// 	} else {
	    	// 		console.log("Event Triggered: " + JSON.stringify(response.event));
	    	// 		console.log("resultIndex: " + JSON.stringify(response.args._resultIndex));
	    	// 		console.log("betAmount: " + JSON.stringify(response.args._betAmount));
	    	// 		console.log("betBalance: " + JSON.stringify(response.args._betBalance));
	    	// 	}
	    	// });

    		// Set bets
    		let account1 = accounts[1];
    		let account2 = accounts[2];
    		let betAmount = web3.toWei(1, "ether");
			let betResultIndex = 1;

			var balance = web3.eth.getBalance(account1);
			console.log("initial account1 balance: " + balance.toString());

			await testTopic.bet(betResultIndex, { from: account1, value: betAmount, gas: 100000 })
			.then(async function() {
				await testTopic.bet(betResultIndex, { from: account2, value: betAmount, gas: 100000 });
			});

			let resultBalance = await testTopic.getResultBalance(betResultIndex);
			assert.equal(resultBalance.toString(), betAmount * 2, "Result balance does not match.");

			await blockHeightManager.mineTo(500);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);   
	    	
	    	// Reveal result
	    	let testFinalResultIndex = 1;
	    	await testTopic.revealResult(testFinalResultIndex);

	    	let finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isTrue(finalResultSet, "Final result should be set.");

	    	let finalResultIndex = await testTopic.getFinalResultIndex();
	    	assert.equal(finalResultIndex, testFinalResultIndex, "Final result index does not match.");

	    	let finalResultName = await testTopic.getFinalResultName();
	    	assert.equal(web3.toUtf8(finalResultName), testTopicParams._resultNames[testFinalResultIndex], "Final result index does not match.");

	    	// Withdraw winnings: accounts[1]
	    	let totalTopicBalance = betAmount * 2;
			console.log("totalTopicBalance: " + totalTopicBalance.toString());

	    	var accountBetBalance = await testTopic.getBetBalance(testFinalResultIndex, { from: account1 })
	    	var expectedWithdrawAmount = (totalTopicBalance * accountBetBalance) / resultBalance;
			console.log("expectedWithdrawAmount: " + expectedWithdrawAmount.toString());

			var balance = web3.eth.getBalance(account1);
			console.log("balance: " + balance.toString());

	    	var expectedAccountBalance = balance.add(expectedWithdrawAmount);
	    	console.log("expectedAccountBalance: " + expectedAccountBalance.toString());

	    	await testTopic.withdrawWinnings({ from: account1, gas: 50000 });
	    	balance = web3.eth.getBalance(account1);
	    	assert.equal(balance.toString(), expectedAccountBalance.toString(), "Account1 balance does not match.");

	    	// watcher.stopWatching();
    	});
    });
});
