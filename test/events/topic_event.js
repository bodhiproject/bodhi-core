const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');
const TopicEvent = artifacts.require("./TopicEvent.sol");
const AddressManager = artifacts.require("./storage/AddressManager.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const assertInvalidOpcode = require('../helpers/assert_invalid_opcode');
const ethAsync = bluebird.promisifyAll(web3.eth);

contract('TopicEvent', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);

    const admin = accounts[0];
    const owner = accounts[1];
    const oracle = accounts[2];

    const testTopicParams = {
        _owner: owner,
        _oracle: oracle,
        _name: ["Will Apple stock reach $300 by t", "he end of 2017?"],
        _resultNames: ["first", "second", "third"],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110
    };

    let addressManager;
    let testTopic;
    let getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        addressManager = await AddressManager.deployed({ from: admin });
        testTopic = await TopicEvent.new(...Object.values(testTopicParams), addressManager.address, { from: owner });
    });

    describe("constructor", async function() {
        it("initializes all the values", async function() {
            assert.equal(await testTopic.owner.call(), testTopicParams._owner);
            assert.equal((await testTopic.getOracle(0))[0], testTopicParams._oracle);
            assert.equal(await testTopic.getEventName(), testTopicParams._name.join(''));
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(0)), testTopicParams._resultNames[0]);
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(1)), testTopicParams._resultNames[1]);
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(2)), testTopicParams._resultNames[2]);
            assert.equal((await testTopic.numOfResults.call()).toNumber(), 3);
            await assert.equal(await testTopic.bettingEndBlock.call(), testTopicParams._bettingEndBlock);
            await assert.equal(await testTopic.resultSettingEndBlock.call(), testTopicParams._resultSettingEndBlock);
        });

        it('can handle a long name using all 10 array slots', async function() {
            let name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef'];
            testTopic = await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, name, 
                testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                testTopicParams._resultSettingEndBlock, addressManager.address);

            assert.equal(await testTopic.getEventName(), name.join(''));
        });

        it('should only concatenate first 10 array slots of the name array', async function() {
            let name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef'];
            testTopic = await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, name, 
                testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                testTopicParams._resultSettingEndBlock, addressManager.address);

            let expected = 'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef';
            assert.equal(await testTopic.getEventName(), expected);
        });

        it('should allow a space as the last character of a name array item', async function() {
            let array = ['abcdefghijklmnopqrstuvwxyzabcde ', 'fghijklmnopqrstuvwxyz'];
            let expected = 'abcdefghijklmnopqrstuvwxyzabcde fghijklmnopqrstuvwxyz';
            testTopic = await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, array, 
                testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                testTopicParams._resultSettingEndBlock, addressManager.address);
            assert.equal(await testTopic.getEventName(), expected);
        });

        it('should allow a space as the first character if the next character is not empty in a name array item', 
            async function() {
            let array = ['abcdefghijklmnopqrstuvwxyzabcdef', ' ghijklmnopqrstuvwxyz'];
            let expected = 'abcdefghijklmnopqrstuvwxyzabcdef ghijklmnopqrstuvwxyz';
            testTopic = await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, array, 
                testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                testTopicParams._resultSettingEndBlock, addressManager.address);

            assert.equal(await testTopic.getEventName(), expected);
        });

        it('can handle using all 10 resultNames', async function() {
            testTopic = await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, testTopicParams._name, 
                ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "ten"],
                testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);

            assert.equal(web3.toUtf8(await testTopic.resultNames.call(0)), "first");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(1)), "second");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(2)), "third");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(3)), "fourth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(4)), "fifth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(5)), "sixth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(6)), "seventh");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(7)), "eighth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(8)), "ninth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(9)), "ten");
        });

        it('should only set the first 10 resultNames', async function() {
            let resultNames = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", 
                "ten", "eleven"];
            testTopic = await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, testTopicParams._name, 
                resultNames, testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, 
                addressManager.address);

            assert.equal(web3.toUtf8(await testTopic.resultNames.call(0)), "first");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(1)), "second");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(2)), "third");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(3)), "fourth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(4)), "fifth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(5)), "sixth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(6)), "seventh");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(7)), "eighth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(8)), "ninth");
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(9)), "ten");

            try {
                await testTopic.resultNames.call(10);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if name is empty', async function() {
            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, [], testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if resultNames 0 or 1 are empty', async function() {
            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, testTopicParams._name, [], 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, testTopicParams._name, ["first"], 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, testTopicParams._name, 
                    ["", "second"], testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, 
                    addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if bettingEndBlock is less than or equal to current block', async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);

            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, [], testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, [], testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock - 1, testTopicParams._resultSettingEndBlock, 
                    addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if resultSettingEndBlock is less than or equal to bettingEndBlock', async function() {
            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, [], testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._bettingEndBlock);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, [], testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._bettingEndBlock - 1);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("fallback function", async function() {
        it("throws upon calling", async function() {
            try {
                await ethAsync.sendTransactionAsync({
                    to: testTopic.address,
                    from: accounts[2],
                    value: 1
                });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("Betting:", async function() {
        it("allows users to bet if the betting end block has not been reached", async function() {
            let initialBalance = web3.eth.getBalance(testTopic.address).toNumber();
            let betAmount = web3.toWei(1, 'ether');
            let betResultIndex = 0;

            await testTopic.bet(betResultIndex, { from: accounts[1], value: betAmount });
            let newBalance = web3.eth.getBalance(testTopic.address).toNumber();
            let difference = newBalance - initialBalance;
            assert.equal(difference, betAmount);

            let resultBalance = await testTopic.getResultBalance(betResultIndex);
            assert.equal(resultBalance, betAmount);

            let betBalance = await testTopic.getBetBalance(betResultIndex, { from: accounts[1] });
            assert.equal(betBalance.toString(), betAmount);
        });
     
        it("does not allow users to bet if the betting end block has been reached", async function() {
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
                assertInvalidOpcode(e);
            }
        });

        it("throws on a bet of 0", async function() {
            let currentBlock = web3.eth.blockNumber;
            assert.isBelow(currentBlock, testTopicParams._bettingEndBlock);

            try {
                let betResultIndex = 1;
                let better = accounts[1];
                let betAmount = 0;
                await testTopic.bet(betResultIndex, { from: better, value: betAmount })
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("Revealing Results:", async function() {
        it("allows the Oracle to reveal the result if the bettingEndBlock has been reached", async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            let currentBlock = web3.eth.blockNumber;
            assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());

            let testFinalResultIndex = 2;
            await testTopic.revealResult(testFinalResultIndex, { from: testTopicParams._oracle });

            assert.isTrue(await testTopic.resultSet.call());
            assert.equal(await testTopic.getFinalResultIndex(), testFinalResultIndex);

            assert.equal(web3.toUtf8(await testTopic.getFinalResultName()), 
                testTopicParams._resultNames[testFinalResultIndex]);
        });

        it("does not allow the Oracle to reveal the result if the bettingEndBlock has not been reached", async function() {
            let currentBlock = web3.eth.blockNumber;
            assert.isBelow(currentBlock, testTopicParams._bettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());
            
            try {
                await testTopic.revealResult(2, { from: testTopicParams._oracle });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("only allows the Oracle to reveal the result", async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(web3.eth.blockNumber, testTopicParams._bettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());
            
            let testFinalResultIndex = 2;
            try {
                await testTopic.revealResult(testFinalResultIndex, { from: owner });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
            assert.isFalse(await testTopic.resultSet.call());

            try {
                await testTopic.revealResult(testFinalResultIndex, { from: admin });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
            assert.isFalse(await testTopic.resultSet.call());

            await testTopic.revealResult(testFinalResultIndex, { from: testTopicParams._oracle });
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal(await testTopic.getFinalResultIndex(), testFinalResultIndex);
            assert.equal(web3.toUtf8(await testTopic.getFinalResultName()), 
                testTopicParams._resultNames[testFinalResultIndex]);
        });
    });

    describe("Withdrawing:", async function() {
        it("allows the better to withdraw their winnings if it has ended and the result was revealed", async function() {
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
            assert.equal(resultBalance.toString(), expectedResultBalance.toString());

            let totalTopicBalance = web3.toBigNumber(await testTopic.getTotalTopicBalance());
            let expectedTotalTopicBalance = web3.toBigNumber(totalBetAmount);
            assert.equal(totalTopicBalance.toString(), expectedTotalTopicBalance.toString());

            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            let currentBlock = web3.eth.blockNumber;
            assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);   
            
            // Reveal result
            let testFinalResultIndex = 1;
            await testTopic.revealResult(testFinalResultIndex, { from: testTopicParams._oracle });
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal(await testTopic.getFinalResultIndex(), testFinalResultIndex);
            assert.equal(web3.toUtf8(await testTopic.getFinalResultName()), 
                testTopicParams._resultNames[testFinalResultIndex]);

            // Withdraw winnings: accounts[1]
            var expectedWithdrawAmount = totalTopicBalance * account1BetAmount / resultBalance;
            await testTopic.withdrawWinnings({ from: account1 });
            var accountBetBalance = web3.toBigNumber(await testTopic.getBetBalance(testFinalResultIndex, 
                { from: account1 }));
            assert.equal(accountBetBalance.toString(), 0);

            expectedWithdrawAmount = totalTopicBalance * account2BetAmount / resultBalance;
            await testTopic.withdrawWinnings({ from: account2 });
            accountBetBalance = web3.toBigNumber(await testTopic.getBetBalance(testFinalResultIndex, 
                { from: account2 }));
            assert.equal(accountBetBalance.toString(), 0);
        });
    });

    describe("GetResultBalance:", async function() {
        it("returns the correct result balance", async function() {
            let betResultIndex = 0;
            let better = accounts[1];
            let betAmount = web3.toWei(1, 'ether');
            await testTopic.bet(betResultIndex, { from: better, value: betAmount });

            assert.equal(await testTopic.getResultBalance(betResultIndex), betAmount);
        });

        it("throws if using an invalid result index", async function() {
            try {
                await testTopic.getResultBalance(3);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("GetBetBalance:", async function() {
        it("returns the correct bet balance", async function() {
            let betResultIndex = 0;
            let better = accounts[1];
            let betAmount = web3.toWei(1, 'ether');
            await testTopic.bet(betResultIndex, { from: better, value: betAmount });

            let actualBetBalance = web3.toBigNumber(await testTopic.getBetBalance(betResultIndex, { from: better }));
            assert.equal(actualBetBalance.toString(), betAmount.toString());
        });

        it("throws if using an invalid result index", async function() {
            try {
                await testTopic.getBetBalance(3);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("GetTotalTopicBalance:", async function() {
        it("returns the correct total topic balance", async function() {
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
            assert.equal(actualTotalTopicBalance.toString(), totalTopicBalance.toString());
        });
    });

    describe("GetFinalResultIndex:", async function() {
        it("returns the correct final result index", async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            let currentBlock = web3.eth.blockNumber;
            assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());

            let expectedFinalResultIndex = 1;
            await testTopic.revealResult(expectedFinalResultIndex, { from: testTopicParams._oracle });

            assert.isTrue(await testTopic.resultSet.call());
            assert.equal(await testTopic.getFinalResultIndex(), expectedFinalResultIndex);
        });

        it("throws if trying to get the final result index before it is set", async function() {
            assert.isFalse(await testTopic.resultSet.call());

            try {
                await testTopic.getFinalResultIndex();
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("GetFinalResultName:", async function() {
        it("returns the correct final result name", async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            let currentBlock = web3.eth.blockNumber;
            assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());

            let finalResultIndex = 0;
            await testTopic.revealResult(finalResultIndex, { from: testTopicParams._oracle });

            assert.isTrue(await testTopic.resultSet.call());
            assert.equal(web3.toUtf8(await testTopic.getFinalResultName()), 
                testTopicParams._resultNames[finalResultIndex]);
        });

        it("throws if trying to get the final result index before it is set", async function() {
            assert.isFalse(await testTopic.resultSet.call());

            try {
                await testTopic.getFinalResultName();
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });
});
