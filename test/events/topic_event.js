const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');
const BodhiToken = artifacts.require("./tokens/BodhiToken.sol");
const AddressManager = artifacts.require("./storage/AddressManager.sol");
const TopicEvent = artifacts.require("./TopicEvent.sol");
const Oracle = artifacts.require("./Oracle.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const assertInvalidOpcode = require('../helpers/assert_invalid_opcode');
const Utils = require('../helpers/utils');
const ethAsync = bluebird.promisifyAll(web3.eth);

contract('TopicEvent', function(accounts) {
    const nativeDecimals = 8;
    const botDecimals = 8;

    const blockHeightManager = new BlockHeightManager(web3);

    const admin = accounts[0];
    const owner = accounts[1];
    const oracle = accounts[2];
    const better1 = accounts[3];
    const better2 = accounts[4];
    const better3 = accounts[5];
    const testTopicParams = {
        _owner: owner,
        _oracle: oracle,
        _name: ["Will Apple stock reach $300 by t", "he end of 2017?"],
        _resultNames: ["first", "second", "third"],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110
    };
    const botBalance = Utils.getBigNumberWithDecimals(1000, botDecimals);

    let token;
    let addressManager;
    let testTopic;
    let votingOracle;
    let getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        token = await BodhiToken.deployed({ from: admin });

        await token.mintByOwner(owner, botBalance, { from: admin });
        assert.equal((await token.balanceOf(owner)).toString(), botBalance.toString());

        await token.mintByOwner(oracle, botBalance, { from: admin });
        assert.equal((await token.balanceOf(oracle)).toString(), botBalance.toString());

        await token.mintByOwner(better1, botBalance, { from: admin });
        assert.equal((await token.balanceOf(better1)).toString(), botBalance.toString());

        await token.mintByOwner(better2, botBalance, { from: admin });
        assert.equal((await token.balanceOf(better2)).toString(), botBalance.toString());

        await token.mintByOwner(better3, botBalance, { from: admin });
        assert.equal((await token.balanceOf(better3)).toString(), botBalance.toString());

        addressManager = await AddressManager.deployed({ from: admin });
        await addressManager.setBodhiTokenAddress(token.address, { from: admin });
        assert.equal(await addressManager.bodhiTokenAddress.call(), token.address);

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

        it('throws if owner address is invalid', async function() {
            try {
                await TopicEvent.new(0, testTopicParams._oracle, testTopicParams._name, testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if oracle address is invalid', async function() {
            try {
                await TopicEvent.new(testTopicParams._owner, 0, testTopicParams._name, testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if AddressManager address is invalid', async function() {
            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._oracle, testTopicParams._name, 
                    testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                    testTopicParams._resultSettingEndBlock, 0);
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

    describe("bet()", async function() {
        it("allows users to bet", async function() {
            let initialBalance = web3.eth.getBalance(testTopic.address).toNumber();
            let betAmount = Utils.getBigNumberWithDecimals(1, nativeDecimals);
            let betResultIndex = 0;

            await testTopic.bet(betResultIndex, { from: oracle, value: betAmount });
            let newBalance = web3.eth.getBalance(testTopic.address).toNumber();
            let difference = newBalance - initialBalance;

            assert.equal(difference, betAmount);
            assert.equal((await testTopic.getTotalBetBalance()).toString(), betAmount.toString());

            let betBalances = await testTopic.getBetBalances({ from: oracle });
            assert.equal(betBalances[betResultIndex].toString(), betAmount.toString());
        });
     
        it("does not allow betting if the bettingEndBlock has been reached", async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);

            try {
                await testTopic.bet(1, { from: oracle, value: 1 })
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws on a bet of 0", async function() {
            assert.isBelow(await getBlockNumber(), testTopicParams._bettingEndBlock);

            try {
                await testTopic.bet(1, { from: oracle, value: 0 })
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe.only('voteFromOracle()', async function() {
        let firstResultIndex = 1;

        beforeEach(async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
            await token.approve(testTopic.address, threshold, { from: oracle });
            assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

            await testTopic.centralizedOracleSetResult(firstResultIndex, threshold, { from: oracle });

            assert.isTrue((await testTopic.getOracle(0))[1]);
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), 1);

            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], firstResultIndex);
            assert.equal(web3.toUtf8(finalResult[1]), testTopicParams._resultNames[firstResultIndex]);

            let oracleArray = await testTopic.getOracle(1);
            votingOracle = await Oracle.at(oracleArray[0]);
        });

        it('allows votes from VotingOracles', async function() {
            assert.equal(await testTopic.getTotalVoteBalance(), 0);

            let vote1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await token.approve(testTopic.address, vote1, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1.toString());
            await votingOracle.voteResult(0, vote1, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[0].toString(), vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(35, botDecimals);
            await token.approve(testTopic.address, vote2, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2.toString());
            await votingOracle.voteResult(2, vote2, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[2].toString(), vote2.toString());

            let vote3 = Utils.getBigNumberWithDecimals(10, botDecimals);
            await token.approve(testTopic.address, vote3, { from: better3 });
            assert.equal((await token.allowance(better3, testTopic.address)).toString(), vote3.toString());
            await votingOracle.voteResult(0, vote3, { from: better3 });
            assert.equal((await testTopic.getVoteBalances({ from: better3 }))[0].toString(), vote3.toString());

            let totalVoteBalance = vote1.add(vote2).add(vote3);
            assert.equal((await testTopic.getTotalVoteBalance()).toString(), totalVoteBalance.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), 
                (await testTopic.totalBotValue.call()).toString());
        });

        it('throws if voting on an invalid result index', async function() {
            try {
                await votingOracle.voteResult(3, 1, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if voting from an invalid Oracle', async function() {
            // TODO: finish
        });

        it('throws if amount is 0', async function() {
            try {
                await votingOracle.voteResult(0, 0, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if allowance is less than the amount', async function() {
            let vote = Utils.getBigNumberWithDecimals(10, botDecimals);
            await token.approve(testTopic.address, vote.sub(1), { from: better1 });

            try {
                await votingOracle.voteResult(0, vote, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('centralizedOracleSetResult()', async function() {
        describe('in valid block range', async function() {
            beforeEach(async function() {
                await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
                assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
                assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);
            });

            it('sets the result and creates a new VotingOracle', async function() {
                assert.isFalse(await testTopic.resultSet.call());

                let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
                await token.approve(testTopic.address, threshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

                try {
                    assert.equal((await testTopic.getOracle(1))[0], 0);
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }

                let finalResultIndex = 1;
                await testTopic.centralizedOracleSetResult(finalResultIndex, threshold, { from: oracle });

                assert.isTrue((await testTopic.getOracle(0))[1]);
                assert.isTrue(await testTopic.resultSet.call());
                assert.equal((await testTopic.status.call()).toNumber(), 1);
                let finalResult = await testTopic.getFinalResult();
                assert.equal(finalResult[0], finalResultIndex);
                assert.equal(web3.toUtf8(finalResult[1]), testTopicParams._resultNames[finalResultIndex]);
                assert.equal((await testTopic.totalBotValue.call()).toString(), threshold.toString());

                assert.equal((await token.balanceOf(testTopic.address)).toString(), threshold.toString());
                let votingOracle = await testTopic.getOracle(1);
                assert.notEqual(votingOracle[0], 0);
                assert.isFalse(votingOracle[1]);
            });

            it('throws if sender is not the CentralizedOracle', async function() {
                assert.isFalse(await testTopic.resultSet.call());

                let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
                await token.approve(testTopic.address, threshold, { from: better1 });
                assert.equal((await token.allowance(better1, testTopic.address)).toString(), threshold.toString());

                try {
                    await testTopic.centralizedOracleSetResult(2, threshold, { from: better1 });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if CentralizedOracle already set the result', async function() {
                assert.isFalse(await testTopic.resultSet.call());

                let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
                await token.approve(testTopic.address, threshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

                let finalResultIndex = 1;
                await testTopic.centralizedOracleSetResult(finalResultIndex, threshold, { from: oracle });

                assert.isTrue((await testTopic.getOracle(0))[1]);
                assert.isTrue(await testTopic.resultSet.call());
                assert.equal((await testTopic.status.call()).toNumber(), 1);
                let finalResult = await testTopic.getFinalResult();
                assert.equal(finalResult[0], finalResultIndex);
                assert.equal(web3.toUtf8(finalResult[1]), testTopicParams._resultNames[finalResultIndex]);

                await token.approve(testTopic.address, threshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

                try {
                    await testTopic.centralizedOracleSetResult(2, threshold, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if botAmount is less than startingOracleThreshold', async function() {
                assert.isFalse(await testTopic.resultSet.call());

                let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
                await token.approve(testTopic.address, threshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

                try {
                    await testTopic.centralizedOracleSetResult(1, Utils.getBigNumberWithDecimals(99, botDecimals), 
                        { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if allowance is less than startingOracleThreshold', async function() {
                assert.isFalse(await testTopic.resultSet.call());

                let amount = Utils.getBigNumberWithDecimals(99, botDecimals);
                await token.approve(testTopic.address, amount, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), amount.toString());

                try {
                    await testTopic.centralizedOracleSetResult(1, Utils.getBigNumberWithDecimals(100, botDecimals), 
                        { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });
        });

        describe('in invalid block range', async function() {
            it('throws if the block is below bettingEndBlock', async function() {
                assert.isBelow(await getBlockNumber(), testTopicParams._bettingEndBlock);
                assert.isFalse(await testTopic.resultSet.call());

                let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
                await token.approve(testTopic.address, threshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

                try {
                    await testTopic.centralizedOracleSetResult(1, threshold, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if the block is above or equal to resultSettingEndBlock', async function() {
                await blockHeightManager.mineTo(testTopicParams._resultSettingEndBlock);
                assert.equal(await getBlockNumber(), testTopicParams._resultSettingEndBlock);
                assert.isFalse(await testTopic.resultSet.call());

                let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
                await token.approve(testTopic.address, threshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

                try {
                    await testTopic.centralizedOracleSetResult(1, threshold, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });
        });
    });

    describe('invalidateCentralizedOracle()', async function() {
        let winningResultIndex = 2;

        beforeEach(async function() {
            assert.isBelow(await getBlockNumber(), testTopicParams._bettingEndBlock);

            let bet1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await testTopic.bet(winningResultIndex, { from: better1, value: bet1 });
            assert.equal((await testTopic.getBetBalances({ from: better1 }))[winningResultIndex].toString(), 
                bet1.toString());

            let bet2 = Utils.getBigNumberWithDecimals(30, botDecimals);
            await testTopic.bet(0, { from: better2, value: bet2 });
            assert.equal((await testTopic.getBetBalances({ from: better2 }))[0].toString(), bet2.toString());

            let bet3 = Utils.getBigNumberWithDecimals(11, botDecimals);
            await testTopic.bet(winningResultIndex, { from: better3, value: bet3 });
            assert.equal((await testTopic.getBetBalances({ from: better3 }))[winningResultIndex].toString(), 
                bet3.toString());

            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());
        });

        describe('in valid block range', async function() {
            beforeEach(async function() {
                await blockHeightManager.mineTo(testTopicParams._resultSettingEndBlock);
                assert.equal(await getBlockNumber(), testTopicParams._resultSettingEndBlock);
            });

            it('sets the result based on majority vote and creates a new VotingOracle', async function() {
                try {
                    assert.equal((await testTopic.getOracle(1))[0], 0);
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }

                await testTopic.invalidateCentralizedOracle();

                assert.isTrue((await testTopic.getOracle(0))[1]);
                assert.isTrue(await testTopic.resultSet.call());
                assert.equal((await testTopic.status.call()).toNumber(), 1);     
                           
                let finalResult = await testTopic.getFinalResult();
                assert.equal(finalResult[0], winningResultIndex);
                assert.equal(web3.toUtf8(finalResult[1]), testTopicParams._resultNames[winningResultIndex]);

                let votingOracle = await testTopic.getOracle(1);
                assert.notEqual(votingOracle[0], 0);
                assert.isFalse(votingOracle[1]);
            });

            it('throws if CentralizedOracle already set the result', async function() {
                try {
                    assert.equal((await testTopic.getOracle(1))[0], 0);
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }

                await testTopic.invalidateCentralizedOracle();

                assert.isTrue((await testTopic.getOracle(0))[1]);
                assert.isTrue(await testTopic.resultSet.call());
                assert.equal((await testTopic.status.call()).toNumber(), 1);     
                           
                let finalResult = await testTopic.getFinalResult();
                assert.equal(finalResult[0], winningResultIndex);
                assert.equal(web3.toUtf8(finalResult[1]), testTopicParams._resultNames[winningResultIndex]);

                let votingOracle = await testTopic.getOracle(1);
                assert.notEqual(votingOracle[0], 0);
                assert.isFalse(votingOracle[1]);

                try {
                    await testTopic.invalidateCentralizedOracle();
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });
        });

        describe('in invalid block range', async function() {
            beforeEach(async function() {
                await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
                assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);
            });    

            it('throws if block is below resultSettingEndBlock', async function() {
                try {
                    assert.equal((await testTopic.getOracle(1))[0], 0);
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }

                try {
                    await testTopic.invalidateCentralizedOracle();
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });
        });
    });

    describe('votingOracleSetResult()', async function() {
        // TODO: implement
    });

    describe('finalizeResult()', async function() {
        // TODO: implement
    });

    describe("withdrawWinnings()", async function() {
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

    describe("getOracle()", async function() {
        it("returns the oracle address and didSetResult flag", async function() {
            assert.equal((await testTopic.getOracle(0))[0], testTopicParams._oracle);
            assert.isFalse((await testTopic.getOracle(0))[1]);
        });
    });

    describe("getEventName()", async function() {
        it("returns the event name as a string", async function() {
            assert.equal(await testTopic.getEventName(), testTopicParams._name.join(''));
        });
    });

    describe("getBetBalances()", async function() {
        it("returns the bet balances", async function() {
            let bet0 = Utils.getBigNumberWithDecimals(13, nativeDecimals);
            await testTopic.bet(0, { from: oracle, value: bet0 });

            let bet1 = Utils.getBigNumberWithDecimals(7, nativeDecimals);
            await testTopic.bet(1, { from: oracle, value: bet1 });

            let bet2 = Utils.getBigNumberWithDecimals(4, nativeDecimals);
            await testTopic.bet(2, { from: oracle, value: bet2 });

            let betBalances = await testTopic.getBetBalances({ from: oracle });
            assert.equal(betBalances[0].toString(), bet0.toString());
            assert.equal(betBalances[1].toString(), bet1.toString());
            assert.equal(betBalances[2].toString(), bet2.toString());
        });
    });

    describe("getVoteBalances()", async function() {
        // TODO: implement
    });

    describe("getTotalBetBalance():", async function() {
        it("returns the total bet balance", async function() {
            let bet0 = Utils.getBigNumberWithDecimals(13, nativeDecimals);
            await testTopic.bet(0, { from: oracle, value: bet0 });

            let bet1 = Utils.getBigNumberWithDecimals(7, nativeDecimals);
            await testTopic.bet(1, { from: oracle, value: bet1 });

            let bet2 = Utils.getBigNumberWithDecimals(4, nativeDecimals);
            await testTopic.bet(2, { from: oracle, value: bet2 });

            let totalBetBalance = bet0.add(bet1).add(bet2);
            assert.equal((await testTopic.getTotalBetBalance()).toString(), totalBetBalance.toString());
        });
    });

    describe("getTotalVoteBalance()", async function() {
        // TODO: implement
    });

    describe("getFinalResult()", async function() {
        it("returns the final result index and name", async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());

            let threshold = Utils.getBigNumberWithDecimals(100, botDecimals);
            await token.approve(testTopic.address, threshold, { from: oracle });
            assert.equal((await token.allowance(oracle, testTopic.address)).toString(), threshold.toString());

            let finalResultIndex = 1;
            await testTopic.centralizedOracleSetResult(finalResultIndex, threshold, { from: oracle });

            assert.isTrue(await testTopic.resultSet.call());

            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], finalResultIndex);
            assert.equal(web3.toUtf8(finalResult[1]), testTopicParams._resultNames[finalResultIndex]);
        });

        it("throws if trying to get the final result before it is set", async function() {
            assert.isFalse(await testTopic.resultSet.call());

            try {
                await testTopic.getFinalResult();
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });
});
