const web3 = global.web3;
const TopicEvent = artifacts.require("./TopicEvent.sol");
const assert = require('chai').assert;
const BlockHeightManager = require('./helpers/block_height_manager');

contract('TopicEvent', function(accounts) {
	const blockHeightManager = new BlockHeightManager(web3);

	const testTopicParams = {
        _owner: accounts[0],
        _oracle: accounts[1],
		_name: "test",
		_resultNames: ["first", "second", "third"],
		_bettingEndBlock: 100
	};

	let testTopic;

	beforeEach(blockHeightManager.snapshot);
  	afterEach(blockHeightManager.revert);

  	describe("New TopicEvent:", async function() {
  		before(async function() {
			testTopic = await TopicEvent.new(...Object.values(testTopicParams));
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

        it('sets the numOfResults correctly', async function() {
            assert.equal((await testTopic.numOfResults.call()).toNumber(), 3, 'numOfResults does not match');
        });

	    it("sets the topic betting end block correctly", async function() {
	    	let bettingEndBlock = await testTopic.bettingEndBlock.call();
			await assert.equal(bettingEndBlock, testTopicParams._bettingEndBlock, 
				"Topic betting end block does not match.");
	    });
  	});

  	describe("Betting:", async function() {
  		it("allows users to bet if the betting end block has not been reached", async function() {
			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

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
	    });
	 
	    it("does not allow users to bet if the betting end block has been reached", async function() {
	    	testTopic = await TopicEvent.new(...Object.values(testTopicParams));

	    	await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

			try {
				let betResultIndex = 1;
	    		let better = accounts[1];
	    		let betAmount = 0;
		        await testTopic.bet(betResultIndex, { from: better, value: betAmount })
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
	    });

	    it("throws on a bet of 0", async function() {
	    	testTopic = await TopicEvent.new(...Object.values(testTopicParams));

	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isBelow(currentBlock, testTopicParams._bettingEndBlock, "Current block has reached bettingEndBlock.");

	    	try {
	    		let betResultIndex = 1;
	    		let better = accounts[1];
	    		let betAmount = 0;
		        await testTopic.bet(betResultIndex, { from: better, value: betAmount })
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
	    });
  	});

    describe("Revealing Results:", async function() {
    	it("allows the resultSetter to reveal the result if the bettingEndBlock has been reached", async function() {
	    	testTopic = await TopicEvent.new(...Object.values(testTopicParams));

	    	await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

	    	var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");

	    	let testFinalResultIndex = 2;
	    	await testTopic.revealResult(testFinalResultIndex, { from: testTopicParams._oracle });

	    	finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isTrue(finalResultSet, "Final result should be set.");

	    	let finalResultIndex = await testTopic.getFinalResultIndex();
	    	assert.equal(finalResultIndex, testFinalResultIndex, "Final result index does not match.");

	    	let finalResultName = await testTopic.getFinalResultName();
	    	assert.equal(web3.toUtf8(finalResultName), testTopicParams._resultNames[testFinalResultIndex], 
	    		"Final result name does not match.");
	    });

	    it("does not allow the resultSetter to reveal the result if the bettingEndBlock has not been reached", async function() {
	    	testTopic = await TopicEvent.new(...Object.values(testTopicParams));

	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isBelow(currentBlock, testTopicParams._bettingEndBlock);

	    	var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");
	    	
	    	try {
	    		let testFinalResultIndex = 2;
		        await testTopic.revealResult(testFinalResultIndex, { from: testTopicParams._oracle });
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
	    });

        it("only allows the resultSetter to reveal the result", async function() {
            testTopic = await TopicEvent.new(...Object.values(testTopicParams));

            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(web3.eth.blockNumber, testTopicParams._bettingEndBlock);

            assert.isFalse(await testTopic.finalResultSet.call(), "Final result should not be set.");
            
            let testFinalResultIndex = 2;
            try {
                await testTopic.revealResult(testFinalResultIndex, { from: accounts[0] });
                assert.fail("Account 0 should not be able to set the result.");
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
            assert.isFalse(await testTopic.finalResultSet.call(), "Final result should not be set.");

            try {
                await testTopic.revealResult(testFinalResultIndex, { from: accounts[2] });
                assert.fail("Account 2 should not be able to set the result.");
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
            assert.isFalse(await testTopic.finalResultSet.call(), "Final result should not be set.");

            await testTopic.revealResult(testFinalResultIndex, { from: testTopicParams._oracle });
            assert.isTrue(await testTopic.finalResultSet.call(), "Final result should set.");
            assert.equal(await testTopic.getFinalResultIndex(), testFinalResultIndex, 
                "Final result index does not match.");
            assert.equal(web3.toUtf8(await testTopic.getFinalResultName()), 
                testTopicParams._resultNames[testFinalResultIndex], "Final result name does not match.");
        });
    });

    describe("Withdrawing:", async function() {
    	it("allows the better to withdraw their winnings if it has ended and the result was revealed", async function() {
    		testTopic = await TopicEvent.new(...Object.values(testTopicParams));

    		// Set bets
    		let account1 = accounts[1];
    		let account1BetAmount = web3.toBigNumber(web3.toWei(1, "ether"));

    		let account2 = accounts[2];
    		let account2BetAmount = web3.toBigNumber(web3.toWei(1, "ether"));

			let betResultIndex = 1;
			let totalBetAmount = account1BetAmount.add(account2BetAmount);

			await testTopic.bet(betResultIndex, { from: account1, value: account1BetAmount })
			.then(async function() {
				await testTopic.bet(betResultIndex, { from: account2, value: account2BetAmount });
			});

			var resultBalance = web3.toBigNumber(await testTopic.getResultBalance(betResultIndex));
			let expectedResultBalance = web3.toBigNumber(totalBetAmount);
			assert.equal(resultBalance.toString(), expectedResultBalance.toString(), 
				"Result balance does not match.");

			let totalTopicBalance = web3.toBigNumber(await testTopic.getTotalTopicBalance());
			let expectedTotalTopicBalance = web3.toBigNumber(totalBetAmount);
			assert.equal(totalTopicBalance.toString(), expectedTotalTopicBalance.toString(), 
				"Total topic balance does not match.");

			await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);   
	    	
	    	// Reveal result
	    	let testFinalResultIndex = 1;
	    	await testTopic.revealResult(testFinalResultIndex, { from: testTopicParams._oracle });

	    	let finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isTrue(finalResultSet, "Final result should be set.");

	    	let finalResultIndex = await testTopic.getFinalResultIndex();
	    	assert.equal(finalResultIndex, testFinalResultIndex, "Final result index does not match.");

	    	let finalResultName = await testTopic.getFinalResultName();
	    	assert.equal(web3.toUtf8(finalResultName), testTopicParams._resultNames[testFinalResultIndex], 
	    		"Final result index does not match.");

	    	// Withdraw winnings: accounts[1]
	    	var expectedWithdrawAmount = totalTopicBalance * account1BetAmount / resultBalance;
	    	await testTopic.withdrawWinnings({ from: account1 });
	    	var accountBetBalance = web3.toBigNumber(await testTopic.getBetBalance(testFinalResultIndex, 
                { from: account1 }));
	    	assert.equal(accountBetBalance.toString(), 0, "Account1 bet balance should be 0.");

	    	expectedWithdrawAmount = totalTopicBalance * account2BetAmount / resultBalance;
	    	await testTopic.withdrawWinnings({ from: account2 });
	    	accountBetBalance = web3.toBigNumber(await testTopic.getBetBalance(testFinalResultIndex, 
                { from: account2 }));
	    	assert.equal(accountBetBalance.toString(), 0, "Account2 bet balance should be 0.");
    	});
    });

    describe("GetResultName:", async function() {
  		it("returns the correct result name for valid result index", async function() {
  			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

  			let resultName1 = await testTopic.getResultName(0);
	    	assert.equal(web3.toUtf8(resultName1), testTopicParams._resultNames[0], "Result name 1 does not match.");

			let resultName2 = await testTopic.getResultName(1);
			assert.equal(web3.toUtf8(resultName2), testTopicParams._resultNames[1], "Result name 2 does not match.");

			let resultName3 = await testTopic.getResultName(2);
			assert.equal(web3.toUtf8(resultName3), testTopicParams._resultNames[2], "Result name 3 does not match.");
  		});

  		it("throws if using an invalid result index", async function() {
  			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

  			try {
				let resultName3 = await testTopic.getResultName(3);
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
  		});
  	});

  	describe("GetResultBalance:", async function() {
  		it("returns the correct result balance", async function() {
			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

			let betResultIndex = 0;
			let better = accounts[1];
			let betAmount = web3.toWei(1, 'ether');
			await testTopic.bet(betResultIndex, { from: better, value: betAmount });

			let actualResultBalance = await testTopic.getResultBalance(betResultIndex);
			assert.equal(actualResultBalance, betAmount, "Result balance does not match.");
	    });

	    it("throws if using an invalid result index", async function() {
  			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

  			try {
				await testTopic.getResultBalance(3);
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
  		});
  	});

  	describe("GetBetBalance:", async function() {
  		it("returns the correct bet balance", async function() {
			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

			let betResultIndex = 0;
			let better = accounts[1];
			let betAmount = web3.toWei(1, 'ether');
			await testTopic.bet(betResultIndex, { from: better, value: betAmount });

			let actualBetBalance = web3.toBigNumber(await testTopic.getBetBalance(betResultIndex, { from: better }));
			assert.equal(actualBetBalance.toString(), betAmount.toString(), "Bet balance does not match.");
	    });

	    it("throws if using an invalid result index", async function() {
  			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

  			try {
				await testTopic.getBetBalance(3);
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
  		});
  	});

  	describe("GetTotalTopicBalance:", async function() {
  		it("returns the correct total topic balance", async function() {
			testTopic = await TopicEvent.new(...Object.values(testTopicParams));

			let account1 = accounts[1];
    		let account1BetAmount = web3.toBigNumber(web3.toWei(1, "ether"));

    		let account2 = accounts[2];
    		let account2BetAmount = web3.toBigNumber(web3.toWei(2, "ether"));

    		let account3 = accounts[3];
    		let account3BetAmount = web3.toBigNumber(web3.toWei(3, "ether"));

			let totalTopicBalance = account1BetAmount.add(account2BetAmount).add(account3BetAmount);

			await testTopic.bet(0, { from: account1, value: account1BetAmount })
			.then(async function() {
				await testTopic.bet(1, { from: account2, value: account2BetAmount });
			}).then(async function() {
				await testTopic.bet(2, { from: account3, value: account3BetAmount });
			});

			let actualTotalTopicBalance = web3.toBigNumber(await testTopic.getTotalTopicBalance());
			assert.equal(actualTotalTopicBalance.toString(), totalTopicBalance.toString(), 
				"Total topic balance does not match.");
	    });
  	});

    describe("GetFinalResultIndex:", async function() {
    	it("returns the correct final result index", async function() {
    		testTopic = await TopicEvent.new(...Object.values(testTopicParams));

    		await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

	    	var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");

	    	let expectedFinalResultIndex = 1;
	    	await testTopic.revealResult(expectedFinalResultIndex, { from: testTopicParams._oracle });

	    	finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isTrue(finalResultSet, "Final result should be set.");

	    	let actualFinalResultIndex = await testTopic.getFinalResultIndex();
	    	assert.equal(actualFinalResultIndex, expectedFinalResultIndex, "Final result index does not match.");
    	});

    	it("throws if trying to get the final result index before it is set", async function() {
    		testTopic = await TopicEvent.new(...Object.values(testTopicParams));

    		var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");

	    	try {
		        await testTopic.getFinalResultIndex();
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
    	});
    });

    describe("GetFinalResultName:", async function() {
    	it("returns the correct final result name", async function() {
    		testTopic = await TopicEvent.new(...Object.values(testTopicParams));

    		await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
	    	let currentBlock = web3.eth.blockNumber;
	    	assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

	    	var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");

	    	let finalResultIndex = 0;
	    	await testTopic.revealResult(finalResultIndex, { from: testTopicParams._oracle });

	    	finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isTrue(finalResultSet, "Final result should be set.");

	    	let actualFinalResultName = await testTopic.getFinalResultName();
	    	assert.equal(web3.toUtf8(actualFinalResultName), testTopicParams._resultNames[finalResultIndex], 
	    		"Final result name does not match.");
    	});

    	it("throws if trying to get the final result index before it is set", async function() {
    		testTopic = await TopicEvent.new(...Object.values(testTopicParams));

    		var finalResultSet = await testTopic.finalResultSet.call();
	    	assert.isFalse(finalResultSet, "Final result should not be set.");

	    	try {
		        await testTopic.getFinalResultName();
		        assert.fail();
			} catch(e) {
		        assert.match(e.message, /invalid opcode/);
		    }
    	});
    });
});
