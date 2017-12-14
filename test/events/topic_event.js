const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');
const BodhiToken = artifacts.require("./tokens/BodhiToken.sol");
const AddressManager = artifacts.require("./storage/AddressManager.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const TopicEvent = artifacts.require("./TopicEvent.sol");
const CentralizedOracle = artifacts.require("./oracles/CentralizedOracle.sol");
const DecentralizedOracle = artifacts.require("./oracles/DecentralizedOracle.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const assertInvalidOpcode = require('../helpers/assert_invalid_opcode');
const Utils = require('../helpers/utils');
const ethAsync = bluebird.promisifyAll(web3.eth);

contract('TopicEvent', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);

    const nativeDecimals = 8;
    const botDecimals = 8;
    const statusBetting = 0;
    const statusOracleVoting = 1;
    const statusCollection = 2;

    const admin = accounts[0];
    const owner = accounts[1];
    const oracle = accounts[2];
    const better1 = accounts[3];
    const better2 = accounts[4];
    const better3 = accounts[5];
    const better4 = accounts[6];
    const better5 = accounts[7];
    const botBalance = Utils.getBigNumberWithDecimals(1000, botDecimals);
    const startingOracleThreshold = Utils.getBigNumberWithDecimals(100, botDecimals);

    const testTopicParams = {
        _oracle: oracle,
        _name: ["Will Apple stock reach $300 by t", "he end of 2017?"],
        _resultNames: ["first", "second", "third"],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110
    };

    let token;
    let addressManager;
    let eventFactory;
    let testTopic;
    let centralizedOracle;
    let decentralizedOracle;
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
        await token.mintByOwner(better4, botBalance, { from: admin });
        assert.equal((await token.balanceOf(better4)).toString(), botBalance.toString());
        await token.mintByOwner(better5, botBalance, { from: admin });
        assert.equal((await token.balanceOf(better5)).toString(), botBalance.toString());

        addressManager = await AddressManager.deployed({ from: admin });
        await addressManager.setBodhiTokenAddress(token.address, { from: admin });
        assert.equal(await addressManager.bodhiTokenAddress.call(), token.address);

        eventFactory = await EventFactory.deployed(addressManager.address, { from: admin });
        await addressManager.setEventFactoryAddress(eventFactory.address, { from: admin });
        assert.equal(await addressManager.getEventFactoryAddress(0), eventFactory.address);

        let oracleFactory = await OracleFactory.deployed(addressManager.address, { from: admin });
        await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: admin });
        assert.equal(await addressManager.getOracleFactoryAddress(0), oracleFactory.address);

        let tx = await eventFactory.createTopic(...Object.values(testTopicParams), { from: owner });
        testTopic = TopicEvent.at(tx.logs[0].args._topicAddress);
        centralizedOracle = CentralizedOracle.at((await testTopic.getOracle(0))[0]);
    });

    describe("constructor", async function() {
        it("initializes all the values", async function() {
            assert.equal(await testTopic.owner.call(), owner);
            assert.equal(await testTopic.getEventName(), testTopicParams._name.join(''));
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(0)), testTopicParams._resultNames[0]);
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(1)), testTopicParams._resultNames[1]);
            assert.equal(web3.toUtf8(await testTopic.resultNames.call(2)), testTopicParams._resultNames[2]);
            assert.equal((await testTopic.numOfResults.call()).toNumber(), 3);

            assert.equal(await centralizedOracle.oracle.call(), testTopicParams._oracle);
            assert.equal(await centralizedOracle.getEventName(), testTopicParams._name.join(''));
            assert.equal(await centralizedOracle.getEventResultName(0), testTopicParams._resultNames[0]);
            assert.equal(await centralizedOracle.getEventResultName(1), testTopicParams._resultNames[1]);
            assert.equal(await centralizedOracle.getEventResultName(2), testTopicParams._resultNames[2]);
            assert.equal(await centralizedOracle.numOfResults.call(), 3);
            assert.equal(await centralizedOracle.bettingEndBlock.call(), testTopicParams._bettingEndBlock);
            assert.equal(await centralizedOracle.resultSettingEndBlock.call(), testTopicParams._resultSettingEndBlock);
            assert.equal((await centralizedOracle.consensusThreshold.call()).toString(), 
                (await addressManager.startingOracleThreshold.call()).toString());
        });

        it('can handle a long name using all 10 array slots', async function() {
            let name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef'];

            testTopic = await TopicEvent.new(owner, testTopicParams._oracle, name, testTopicParams._resultNames, 
                testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
            assert.equal(await testTopic.getEventName(), name.join(''));
        });

        it('should only concatenate first 10 array slots of the name array', async function() {
            let name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef'];
            testTopic = await TopicEvent.new(owner, testTopicParams._oracle, name, testTopicParams._resultNames, 
                testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);

            let expected = 'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef';
            assert.equal(await testTopic.getEventName(), expected);
        });

        it('should allow a space as the last character of a name array item', async function() {
            let array = ['abcdefghijklmnopqrstuvwxyzabcde ', 'fghijklmnopqrstuvwxyz'];
            let expected = 'abcdefghijklmnopqrstuvwxyzabcde fghijklmnopqrstuvwxyz';

            testTopic = await TopicEvent.new(owner, testTopicParams._oracle, array, testTopicParams._resultNames, 
                testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
            assert.equal(await testTopic.getEventName(), expected);
        });

        it('should allow a space as the first character if the next character is not empty in a name array item', 
            async function() {
            let array = ['abcdefghijklmnopqrstuvwxyzabcdef', ' ghijklmnopqrstuvwxyz'];
            let expected = 'abcdefghijklmnopqrstuvwxyzabcdef ghijklmnopqrstuvwxyz';
            testTopic = await TopicEvent.new(owner, testTopicParams._oracle, array, testTopicParams._resultNames, 
                testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);

            assert.equal(await testTopic.getEventName(), expected);
        });

        it('can handle using all 10 resultNames', async function() {
            let results = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "ten"];
            testTopic = await TopicEvent.new(owner, testTopicParams._oracle, testTopicParams._name, results, 
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
            testTopic = await TopicEvent.new(owner, testTopicParams._oracle, testTopicParams._name, resultNames, 
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
                await TopicEvent.new(owner, 0, testTopicParams._name, testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if AddressManager address is invalid', async function() {
            try {
                await TopicEvent.new(owner, testTopicParams._centralizedOracle, testTopicParams._name, 
                    testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                    testTopicParams._resultSettingEndBlock, 0);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if name is empty', async function() {
            try {
                await TopicEvent.new(owner, testTopicParams._centralizedOracle, [], testTopicParams._resultNames, 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if resultNames 0 or 1 are empty', async function() {
            try {
                await TopicEvent.new(owner, testTopicParams._centralizedOracle, testTopicParams._name, [], 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._centralizedOracle, testTopicParams._name, 
                    ["first"], testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, 
                    addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(owner, testTopicParams._centralizedOracle, testTopicParams._name, ["", "second"], 
                    testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if bettingEndBlock is less than or equal to current block', async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);

            try {
                await TopicEvent.new(owner, testTopicParams._centralizedOracle, testTopicParams._name, 
                    testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                    testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(owner, testTopicParams._centralizedOracle, testTopicParams._name, 
                    testTopicParams._resultNames, testTopicParams._bettingEndBlock - 1, 
                    testTopicParams._resultSettingEndBlock, addressManager.address);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if resultSettingEndBlock is less than or equal to bettingEndBlock', async function() {
            try {
                await TopicEvent.new(owner, testTopicParams._centralizedOracle, testTopicParams._name, 
                    testTopicParams._resultNames, testTopicParams._bettingEndBlock, testTopicParams._bettingEndBlock);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await TopicEvent.new(testTopicParams._owner, testTopicParams._centralizedOracle, testTopicParams._name, 
                    testTopicParams._resultNames, testTopicParams._bettingEndBlock, 
                    testTopicParams._bettingEndBlock - 1);
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
            await centralizedOracle.bet(betResultIndex, { from: better1, value: betAmount });

            let newBalance = web3.eth.getBalance(testTopic.address).toNumber();
            let difference = newBalance - initialBalance;
            assert.equal(difference, betAmount);
            assert.equal((await testTopic.totalQtumValue.call()).toString(), betAmount.toString());

            let betBalances = await testTopic.getBetBalances({ from: better1 });
            assert.equal(betBalances[betResultIndex].toString(), betAmount.toString());
        });

        it('throws on an invalid result index', async function() {
            assert.isBelow(await getBlockNumber(), testTopicParams._bettingEndBlock);

            try {
                await centralizedOracle.bet(3, { from: better1, value: 1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if receiving from an address that is not the CentralizedOracle contract', async function() {
            assert.isBelow(await getBlockNumber(), testTopicParams._bettingEndBlock);

            try {
                await testTopic.bet(better1, 0, { from: better1, value: 1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws on a bet of 0", async function() {
            assert.isBelow(await getBlockNumber(), testTopicParams._bettingEndBlock);

            try {
                await centralizedOracle.bet(0, { from: better1, value: 0 });
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

                assert.isFalse(await testTopic.resultSet.call());
            });

            it('sets the result and creates a new CentralizedOracle', async function() {
                await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), 
                    startingOracleThreshold.toString());

                try {
                    assert.equal((await testTopic.getOracle(1))[0], 0);
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }

                let finalResultIndex = 1;
                await centralizedOracle.setResult(finalResultIndex, { from: oracle });

                assert.isTrue((await testTopic.getOracle(0))[1]);
                assert.isTrue(await testTopic.resultSet.call());
                assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
                let finalResult = await testTopic.getFinalResult();
                assert.equal(finalResult[0], finalResultIndex);
                assert.equal(finalResult[1], testTopicParams._resultNames[finalResultIndex]);
                assert.isFalse(finalResult[2]);
                assert.equal((await testTopic.totalBotValue.call()).toString(), startingOracleThreshold.toString());

                assert.equal((await token.balanceOf(testTopic.address)).toString(), startingOracleThreshold.toString());
                let decentralizedOracle = await testTopic.getOracle(1);
                assert.notEqual(decentralizedOracle[0], 0);
                assert.isFalse(decentralizedOracle[1]);
            });

            it('throws on an invalid result index', async function() {
                await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), 
                    startingOracleThreshold.toString());

                try {
                    assert.equal((await testTopic.getOracle(1))[0], 0);
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }

                try {
                    await centralizedOracle.setResult(3, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if sender is not the CentralizedOracle', async function() {
                await token.approve(testTopic.address, startingOracleThreshold, { from: better1 });
                assert.equal((await token.allowance(better1, testTopic.address)).toString(), 
                    startingOracleThreshold.toString());

                try {
                    await testTopic.centralizedOracleSetResult(oracle, 2, startingOracleThreshold, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if CentralizedOracle already set the result', async function() {
                await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });

                let finalResultIndex = 1;
                await centralizedOracle.setResult(finalResultIndex, { from: oracle });

                assert.isTrue((await testTopic.getOracle(0))[1]);
                assert.isTrue(await testTopic.resultSet.call());
                assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
                let finalResult = await testTopic.getFinalResult();
                assert.equal(finalResult[0], finalResultIndex);
                assert.equal(finalResult[1], testTopicParams._resultNames[finalResultIndex]);
                assert.isFalse(finalResult[2]);

                await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });

                try {
                    await centralizedOracle.setResult(2, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if allowance is less than consensusThreshold', async function() {
                let amount = Utils.getBigNumberWithDecimals(99, botDecimals);
                await token.approve(testTopic.address, amount, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), amount.toString());

                try {
                    await centralizedOracle.setResult(1, { from: oracle });
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

                await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });

                try {
                    await centralizedOracle.setResult(1, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if the block is above or equal to resultSettingEndBlock', async function() {
                await blockHeightManager.mineTo(testTopicParams._resultSettingEndBlock);
                assert.equal(await getBlockNumber(), testTopicParams._resultSettingEndBlock);
                assert.isFalse(await testTopic.resultSet.call());

                await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });

                try {
                    await centralizedOracle.setResult(1, { from: oracle });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });
        });
    });

    describe('invalidateOracle()', async function() {
        beforeEach(async function() {
            assert.isBelow(await getBlockNumber(), testTopicParams._bettingEndBlock);

            let bet1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await centralizedOracle.bet(2, { from: better1, value: bet1 });
            assert.equal((await testTopic.getBetBalances({ from: better1 }))[2].toString(), 
                bet1.toString());

            let bet2 = Utils.getBigNumberWithDecimals(30, botDecimals);
            await centralizedOracle.bet(0, { from: better2, value: bet2 });
            assert.equal((await testTopic.getBetBalances({ from: better2 }))[0].toString(), bet2.toString());

            let bet3 = Utils.getBigNumberWithDecimals(11, botDecimals);
            await centralizedOracle.bet(2, { from: better3, value: bet3 });
            assert.equal((await testTopic.getBetBalances({ from: better3 }))[2].toString(), 
                bet3.toString());

            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            assert.isFalse(await testTopic.resultSet.call());

            await blockHeightManager.mineTo(testTopicParams._resultSettingEndBlock);
            assert.equal(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            try {
                assert.equal((await testTopic.getOracle(1))[0], 0);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            await centralizedOracle.invalidateOracle();

            let oracleArray = await testTopic.getOracle(1);
            assert.notEqual(oracleArray[0], 0);
            assert.isFalse(oracleArray[1]);
            decentralizedOracle = await DecentralizedOracle.at(oracleArray[0]);
        });

        it('sets the values and creates a new DecentralizedOracle when invalidating a CentralizedOracle', 
            async function() {
            assert.isTrue((await testTopic.getOracle(0))[1]);
            assert.isFalse(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);            
        });

        it('sets the values and creates a new DecentralizedOracle when invalidating a DecentralizedOracle', 
            async function() {
            await blockHeightManager.mineTo(await decentralizedOracle.arbitrationEndBlock.call());

            try {
                assert.equal((await testTopic.getOracle(2))[0], 0);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            await decentralizedOracle.invalidateOracle();
            assert.isTrue((await testTopic.getOracle(1))[1]);
            assert.isFalse(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);

            let oracleArray = await testTopic.getOracle(2);
            assert.notEqual(oracleArray[0], 0);
            assert.isFalse(oracleArray[1]);
        });

        it('throws if receiving from an address that is not an Oracle contract', async function() {
            try {
                await testTopic.invalidateOracle(startingOracleThreshold, { from: better1 })
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if the Oracle result is already set', async function() {
            try {
                await centralizedOracle.invalidateOracle();
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('voteFromOracle()', async function() {
        let firstResultIndex = 1;

        beforeEach(async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
            assert.equal((await token.allowance(oracle, testTopic.address)).toString(), 
                startingOracleThreshold.toString());

            await centralizedOracle.setResult(firstResultIndex, { from: oracle });

            assert.isTrue((await testTopic.getOracle(0))[1]);
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], firstResultIndex);
            assert.equal(finalResult[1], testTopicParams._resultNames[firstResultIndex]);
            assert.isFalse(finalResult[2]);

            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);
        });

        it('allows votes from DecentralizedOracles', async function() {
            assert.equal((await testTopic.totalBotValue.call()).toString(), startingOracleThreshold.toString());

            let vote1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await token.approve(testTopic.address, vote1, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1.toString());
            await decentralizedOracle.voteResult(0, vote1, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[0].toString(), vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(35, botDecimals);
            await token.approve(testTopic.address, vote2, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(2, vote2, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[2].toString(), vote2.toString());

            let vote3 = Utils.getBigNumberWithDecimals(10, botDecimals);
            await token.approve(testTopic.address, vote3, { from: better3 });
            assert.equal((await token.allowance(better3, testTopic.address)).toString(), vote3.toString());
            await decentralizedOracle.voteResult(0, vote3, { from: better3 });
            assert.equal((await testTopic.getVoteBalances({ from: better3 }))[0].toString(), vote3.toString());

            let totalVoteBalance = startingOracleThreshold.add(vote1).add(vote2).add(vote3);
            assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), 
                (await testTopic.totalBotValue.call()).toString());
        });

        it('throws if voting on an invalid result index', async function() {
            try {
                await decentralizedOracle.voteResult(3, 1, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if voting from an invalid DecentralizedOracle', async function() {
            let numOfResults = await testTopic.numOfResults.call();
            let lastResultIndex = 1;
            let arbitrationEndBlock = await getBlockNumber() + 100;
            decentralizedOracle = await DecentralizedOracle.new(owner, testTopic.address, testTopicParams._name, 
                testTopicParams._resultNames, numOfResults, lastResultIndex, arbitrationEndBlock, 
                startingOracleThreshold, { from: owner });

            try {
                await decentralizedOracle.voteResult(2, 1, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if amount is 0', async function() {
            try {
                await decentralizedOracle.voteResult(0, 0, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if allowance is less than the amount', async function() {
            let vote = Utils.getBigNumberWithDecimals(10, botDecimals);
            await token.approve(testTopic.address, vote.sub(1), { from: better1 });

            try {
                await decentralizedOracle.voteResult(0, vote, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('votingOracleSetResult()', async function() {
        let centralizedOracleResultIndex = 1;
        let votingOracle1ResultIndex = 2;
        let votingOracle2;

        beforeEach(async function() {
            // CentralizedOracle sets result
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
            assert.equal((await token.allowance(oracle, testTopic.address)).toString(), 
                startingOracleThreshold.toString());

            await centralizedOracle.setResult(centralizedOracleResultIndex, { from: oracle });

            assert.isTrue((await testTopic.getOracle(0))[1]);
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
            assert.equal((await testTopic.getFinalResult())[0], centralizedOracleResultIndex);
            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], centralizedOracleResultIndex);
            assert.equal(finalResult[1], testTopicParams._resultNames[centralizedOracleResultIndex]);
            assert.isFalse(finalResult[2]);

            // DecentralizedOracle voting
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);

            assert.equal((await testTopic.totalBotValue.call()).toString(), startingOracleThreshold.toString());

            let vote1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await token.approve(testTopic.address, vote1, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1.toString());
            await decentralizedOracle.voteResult(0, vote1, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[0].toString(), vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(35, botDecimals);
            await token.approve(testTopic.address, vote2, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(0, vote2, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[0].toString(), vote2.toString());

            // Verify no DecentralizedOracle at index 2
            try {
                await testTopic.getOracle(2);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            // Winning vote
            let vote3 = startingOracleThreshold.add(1);
            await token.approve(testTopic.address, vote3, { from: better3 });
            assert.equal((await token.allowance(better3, testTopic.address)).toString(), vote3.toString());
            await decentralizedOracle.voteResult(votingOracle1ResultIndex, vote3, { from: better3 });
            assert.equal((await testTopic.getVoteBalances({ from: better3 }))[votingOracle1ResultIndex].toString(), 
                vote3.toString());

            let totalVoteBalance = startingOracleThreshold.add(vote1).add(vote2).add(vote3);
            assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), 
                (await testTopic.totalBotValue.call()).toString());
            assert.isAbove((await decentralizedOracle.getTotalVotes())[votingOracle1ResultIndex].toNumber(), 
                (await decentralizedOracle.consensusThreshold.call()).toNumber());
            assert.isTrue(await decentralizedOracle.finished.call());
        });

        it('sets the result and creates a new DecentralizedOracle', async function() {
            assert.isTrue((await testTopic.getOracle(1))[1]);
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
            assert.equal((await testTopic.getFinalResult())[0], votingOracle1ResultIndex);

            assert.notEqual((await testTopic.getOracle(2))[0], 0);
            votingOracle2 = await DecentralizedOracle.at((await testTopic.getOracle(2))[0]);
            assert.equal(await votingOracle2.lastResultIndex.call(), votingOracle1ResultIndex);
        });

        it('throws if setting from invalid DecentralizedOracle', async function() {
            let numOfResults = await testTopic.numOfResults.call();
            let arbitrationEndBlock = await getBlockNumber() + 100;
            let threshold = (await decentralizedOracle.consensusThreshold.call())
                .add(Utils.getBigNumberWithDecimals(10, botDecimals));
            votingOracle2 = await DecentralizedOracle.new(owner, testTopic.address, testTopicParams._name, 
                testTopicParams._resultNames, numOfResults, votingOracle1ResultIndex, arbitrationEndBlock, threshold, 
                { from: owner });
            assert.notEqual((await testTopic.getOracle(2))[0], votingOracle2.address);

            let winningVote = threshold.add(1);
            await token.approve(testTopic.address, winningVote, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), winningVote.toString());

            try {
                await votingOracle2.voteResult(0, winningVote, { from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('finalizeResult()', async function() {
        let centralizedOracleResult = 1;

        beforeEach(async function() {
            // CentralizedOracle sets result
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
            assert.equal((await token.allowance(oracle, testTopic.address)).toString(), 
                startingOracleThreshold.toString());

            await centralizedOracle.setResult(centralizedOracleResult, { from: oracle });

            assert.isTrue((await testTopic.getOracle(0))[1]);
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], centralizedOracleResult);
            assert.equal(finalResult[1], testTopicParams._resultNames[centralizedOracleResult]);
            assert.isFalse(finalResult[2]);

            // DecentralizedOracle voting under consensusThreshold
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);

            let vote1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await token.approve(testTopic.address, vote1, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1.toString());
            await decentralizedOracle.voteResult(0, vote1, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[0].toString(), vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(35, botDecimals);
            await token.approve(testTopic.address, vote2, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(2, vote2, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[2].toString(), vote2.toString());

            let vote3 = Utils.getBigNumberWithDecimals(10, botDecimals);
            await token.approve(testTopic.address, vote3, { from: better3 });
            assert.equal((await token.allowance(better3, testTopic.address)).toString(), vote3.toString());
            await decentralizedOracle.voteResult(0, vote3, { from: better3 });
            assert.equal((await testTopic.getVoteBalances({ from: better3 }))[0].toString(), vote3.toString());

            let totalVoteBalance = startingOracleThreshold.add(vote1).add(vote2).add(vote3);
            assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), 
                (await testTopic.totalBotValue.call()).toString());

            // Advance to arbitrationEndBlock
            let arbitrationEndBlock = await decentralizedOracle.arbitrationEndBlock.call();
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock.toNumber());

            assert.notEqual((await testTopic.status.call()).toNumber(), statusCollection);
            assert.isFalse(await decentralizedOracle.finished.call());
        });

        it('finalizes the result', async function() {
            await decentralizedOracle.finalizeResult({ from: better1 });
            assert.isTrue(await decentralizedOracle.finished.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusCollection);

            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], centralizedOracleResult);
            assert.equal(finalResult[1], testTopicParams._resultNames[centralizedOracleResult]);
            assert.isTrue(finalResult[2]);
        });

        it('throws if an invalid DecentralizedOracle tries to finalize the result', async function() {
            let numOfResults = await testTopic.numOfResults.call();
            let arbitrationEndBlock = (await decentralizedOracle.arbitrationEndBlock.call()).add(100);
            let threshold = (await decentralizedOracle.consensusThreshold.call()).add(10);
            let votingOracle2 = await DecentralizedOracle.new(owner, testTopic.address, testTopicParams._name, 
                testTopicParams._resultNames, numOfResults, centralizedOracleResult, arbitrationEndBlock, threshold, 
                { from: owner });

            try {
                await votingOracle2.finalizeResult({ from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
            
            assert.isFalse(await votingOracle2.finished.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
        });

        it('throws if the current status is not Status:OracleVoting', async function() {
            await decentralizedOracle.finalizeResult({ from: better1 });
            assert.equal((await testTopic.status.call()).toNumber(), statusCollection);

            try {
                await decentralizedOracle.finalizeResult({ from: better2 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("withdrawWinnings()", async function() {
        let bet1, bet2, bet3, bet4;
        let cOracleResult = 2;
        let dOracle1Result = 1;
        let dOracle2Result = 2;

        beforeEach(async function() {
            // First round of betting
            bet1 = web3.toBigNumber(7777777777);
            await centralizedOracle.bet(0, { from: better1, value: bet1 });
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), bet1.toNumber());
            assert.equal((await testTopic.getBetBalances({ from: better1 }))[0].toString(), bet1.toString());

            bet2 = web3.toBigNumber(2212345678);
            await centralizedOracle.bet(1, { from: better2, value: bet2 });
            var totalBetBalance = bet1.add(bet2);
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());
            assert.equal((await testTopic.getBetBalances({ from: better2 }))[1].toString(), bet2.toString());

            bet3 = web3.toBigNumber(3027596457);
            await centralizedOracle.bet(cOracleResult, { from: better3, value: bet3 });
            totalBetBalance = bet1.add(bet2).add(bet3);
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());
            assert.equal((await testTopic.getBetBalances({ from: better3 }))[cOracleResult].toString(), 
                bet3.toString());

            bet4 = web3.toBigNumber(1298765432);
            await centralizedOracle.bet(cOracleResult, { from: better4, value: bet4 });
            totalBetBalance = bet1.add(bet2).add(bet3).add(bet4);
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());
            assert.equal((await testTopic.getBetBalances({ from: better4 }))[cOracleResult].toString(), 
                bet4.toString());

            assert.equal((await testTopic.totalQtumValue.call()).toString(), totalBetBalance.toString());

            // CentralizedOracle sets result 2
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

            await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
            assert.equal((await token.allowance(oracle, testTopic.address)).toString(), 
                startingOracleThreshold.toString());

            await centralizedOracle.setResult(cOracleResult, { from: oracle });
            assert.isTrue((await testTopic.getOracle(0))[1]);
            assert.isTrue(await testTopic.resultSet.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], cOracleResult);
            assert.equal(finalResult[1], testTopicParams._resultNames[cOracleResult]);
            assert.isFalse(finalResult[2]);

            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);
        });

        it('transfers the tokens for a single voting round', async function() {
            // DecentralizedOracle voting under consensusThreshold
            let vote1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await token.approve(testTopic.address, vote1, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1.toString());
            await decentralizedOracle.voteResult(0, vote1, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[0].toString(), vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(35, botDecimals);
            await token.approve(testTopic.address, vote2, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(1, vote2, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[1].toString(), vote2.toString());

            let totalVoteBalance = startingOracleThreshold.add(vote1).add(vote2);
            let totalBotValue = await testTopic.totalBotValue.call();
            assert.equal(totalBotValue.toString(), totalVoteBalance.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), totalBotValue.toString());

            // DecentralizedOracle finalize result
            let arbitrationEndBlock = await decentralizedOracle.arbitrationEndBlock.call();
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock.toNumber());
            
            await decentralizedOracle.finalizeResult({ from: better1 });
            assert.isTrue(await decentralizedOracle.finished.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusCollection);

            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], cOracleResult);
            assert.equal(finalResult[1], testTopicParams._resultNames[cOracleResult]);
            assert.isTrue(finalResult[2]);

            // Winners withdraw
            // better3
            var qtumWon = await testTopic.calculateQtumContributorWinnings({ from: better3 });
            var botWon = await testTopic.calculateBotContributorWinnings({ from: better3 });
            var expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
            var expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
            await testTopic.withdrawWinnings({ from: better3 });
            assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
            assert.isTrue(await testTopic.didWithdraw.call(better3));

            // better4
            qtumWon = await testTopic.calculateQtumContributorWinnings({ from: better4 });
            botWon = await testTopic.calculateBotContributorWinnings({ from: better4 });
            expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
            expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
            await testTopic.withdrawWinnings({ from: better4 });
            assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
            assert.isTrue(await testTopic.didWithdraw.call(better4));

            // // oracle
            qtumWon = await testTopic.calculateQtumContributorWinnings({ from: oracle });
            botWon = await testTopic.calculateBotContributorWinnings({ from: oracle });
            expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
            expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
            await testTopic.withdrawWinnings({ from: oracle });
            assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
            assert.isTrue(await testTopic.didWithdraw.call(oracle));

            // Losers withdraw
            assert.equal(await testTopic.calculateQtumContributorWinnings({ from: better1 }), 0);
            assert.equal(await testTopic.calculateBotContributorWinnings({ from: better1 }), 0);
            await testTopic.withdrawWinnings({ from: better1 });
            assert.isTrue(await testTopic.didWithdraw.call(better1));

            assert.equal(await testTopic.calculateQtumContributorWinnings({ from: better2 }), 0);
            assert.equal(await testTopic.calculateBotContributorWinnings({ from: better2 }), 0);
            await testTopic.withdrawWinnings({ from: better2 });
            assert.isTrue(await testTopic.didWithdraw.call(better2));
        });

        it('transfers the tokens for a multiple betting/voting rounds', async function() {
            // DecentralizedOracle1 voting hits consensusThreshold
            let vote1a = web3.toBigNumber(6112345678);
            await token.approve(testTopic.address, vote1a, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1a.toString());
            await decentralizedOracle.voteResult(dOracle1Result, vote1a, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[dOracle1Result].toString(), 
                vote1a.toString());

            let vote2 = web3.toBigNumber(3887654322);
            await token.approve(testTopic.address, vote2, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(dOracle1Result, vote2, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[dOracle1Result].toString(), 
                vote2.toString());

            var totalVoteBalance = startingOracleThreshold.add(vote1a).add(vote2);
            var totalBotValue = await testTopic.totalBotValue.call();
            assert.equal(totalBotValue.toString(), totalVoteBalance.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), totalBotValue.toString());

            // DecentralizedOracle2 voting hits consensusThreshold
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(2))[0]);
            assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), 
                Utils.getBigNumberWithDecimals(110, botDecimals).toString());

            let vote3 = web3.toBigNumber(7373737373);
            await token.approve(testTopic.address, vote3, { from: better3 });
            assert.equal((await token.allowance(better3, testTopic.address)).toString(), vote3.toString());
            await decentralizedOracle.voteResult(dOracle2Result, vote3, { from: better3 });
            assert.equal((await testTopic.getVoteBalances({ from: better3 }))[dOracle2Result].toString(), 
                vote3.toString());

            let vote4 = web3.toBigNumber(3626262627);
            await token.approve(testTopic.address, vote4, { from: better4 });
            assert.equal((await token.allowance(better4, testTopic.address)).toString(), vote4.toString());
            await decentralizedOracle.voteResult(dOracle2Result, vote4, { from: better4 });
            assert.equal((await testTopic.getVoteBalances({ from: better4 }))[dOracle2Result].toString(), 
                vote4.toString());

            totalVoteBalance = totalVoteBalance.add(vote3).add(vote4);
            totalBotValue = await testTopic.totalBotValue.call();
            assert.equal(totalBotValue.toString(), totalVoteBalance.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), totalBotValue.toString());

            // DecentralizedOracle3 voting under consensusThreshold
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(3))[0]);
            assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), 
                Utils.getBigNumberWithDecimals(120, botDecimals).toString());

            let vote1b = web3.toBigNumber(7135713713);
            await token.approve(testTopic.address, vote1b, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1b.toString());
            await decentralizedOracle.voteResult(dOracle1Result, vote1b, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[dOracle1Result].toString(), 
                vote1a.add(vote1b).toString());

            // DecentralizedOracle finalize result
            let arbitrationEndBlock = await decentralizedOracle.arbitrationEndBlock.call();
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock.toNumber());
            
            await decentralizedOracle.finalizeResult({ from: better1 });
            assert.isTrue(await decentralizedOracle.finished.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusCollection);

            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], dOracle2Result);
            assert.equal(finalResult[1], testTopicParams._resultNames[dOracle2Result]);
            assert.isTrue(finalResult[2]);

            let expectedQtumValue = bet1.add(bet2).add(bet3).add(bet4);
            assert.equal((await testTopic.totalQtumValue.call()).toString(), expectedQtumValue.toString());
            let expectedBotValue = startingOracleThreshold.add(vote1a).add(vote1b).add(vote2).add(vote3).add(vote4);
            assert.equal((await testTopic.totalBotValue.call()).toString(), expectedBotValue.toString());

            // better3 winner withdraw
            var qtumWon = await testTopic.calculateQtumContributorWinnings({ from: better3 });
            var botWon = await testTopic.calculateBotContributorWinnings({ from: better3 });
            var expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
            var expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
            assert.isFalse(await testTopic.didWithdraw.call(better3));
            await testTopic.withdrawWinnings({ from: better3 });
            assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
            assert.isTrue(await testTopic.didWithdraw.call(better3));

            // better4 winner withdraw
            qtumWon = await testTopic.calculateQtumContributorWinnings({ from: better4 });
            botWon = await testTopic.calculateBotContributorWinnings({ from: better4 });
            expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
            expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
            assert.isFalse(await testTopic.didWithdraw.call(better4));
            await testTopic.withdrawWinnings({ from: better4 });
            assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
            assert.isTrue(await testTopic.didWithdraw.call(better4));

            // oracle winner withdraw
            qtumWon = await testTopic.calculateQtumContributorWinnings({ from: oracle });
            botWon = await testTopic.calculateBotContributorWinnings({ from: oracle });
            expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
            expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
            assert.isFalse(await testTopic.didWithdraw.call(oracle));
            await testTopic.withdrawWinnings({ from: oracle });
            assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
            assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
            assert.isTrue(await testTopic.didWithdraw.call(oracle));

            // better1 loser withdraw
            assert.equal(await testTopic.calculateQtumContributorWinnings({ from: better1 }), 0);
            assert.equal(await testTopic.calculateBotContributorWinnings({ from: better1 }), 0);
            assert.isFalse(await testTopic.didWithdraw.call(better1));
            await testTopic.withdrawWinnings({ from: better1 });
            assert.isTrue(await testTopic.didWithdraw.call(better1));

            // better2 loser withdraw
            assert.equal(await testTopic.calculateQtumContributorWinnings({ from: better2 }), 0);
            assert.equal(await testTopic.calculateBotContributorWinnings({ from: better2 }), 0);
            assert.isFalse(await testTopic.didWithdraw.call(better2));
            await testTopic.withdrawWinnings({ from: better2 });
            assert.isTrue(await testTopic.didWithdraw.call(better2));
        });

        it('throws if status is not Status:Collection', async function() {
            assert.notEqual((await testTopic.status.call()).toNumber(), statusCollection);
            try {
                await testTopic.withdrawWinnings({ from: oracle });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if already withdrawn', async function() {
            // DecentralizedOracle finalize result
            let arbitrationEndBlock = await decentralizedOracle.arbitrationEndBlock.call();
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock.toNumber());
            
            await decentralizedOracle.finalizeResult({ from: better1 });
            assert.isTrue(await decentralizedOracle.finished.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusCollection);

            let finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], cOracleResult);
            assert.equal(finalResult[1], testTopicParams._resultNames[cOracleResult]);
            assert.isTrue(finalResult[2]);

            // Winner withdraw
            await testTopic.withdrawWinnings({ from: better3 });
            assert.isTrue(await testTopic.didWithdraw.call(better3));

            try {
                await testTopic.withdrawWinnings({ from: better3 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            // Loser withdraw
            await testTopic.withdrawWinnings({ from: better1 });
            assert.isTrue(await testTopic.didWithdraw.call(better1));

            try {
                await testTopic.withdrawWinnings({ from: better1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("getOracle()", async function() {
        it("returns the oracle address and didSetResult flag", async function() {
            assert.equal((await testTopic.getOracle(0))[0], centralizedOracle.address);
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
            await centralizedOracle.bet(0, { from: oracle, value: bet0 });

            let bet1 = Utils.getBigNumberWithDecimals(7, nativeDecimals);
            await centralizedOracle.bet(1, { from: oracle, value: bet1 });

            let bet2 = Utils.getBigNumberWithDecimals(4, nativeDecimals);
            await centralizedOracle.bet(2, { from: oracle, value: bet2 });

            let betBalances = await testTopic.getBetBalances({ from: oracle });
            assert.equal(betBalances[0].toString(), bet0.toString());
            assert.equal(betBalances[1].toString(), bet1.toString());
            assert.equal(betBalances[2].toString(), bet2.toString());
        });
    });

    describe("getVoteBalances()", async function() {
        it('returns the vote balances', async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
            await centralizedOracle.setResult(1, { from: oracle });
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);

            let vote1 = Utils.getBigNumberWithDecimals(20, botDecimals);
            await token.approve(testTopic.address, vote1, { from: better1 });
            await decentralizedOracle.voteResult(0, vote1, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[0].toString(), vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(35, botDecimals);
            await token.approve(testTopic.address, vote2, { from: better2 });
            await decentralizedOracle.voteResult(2, vote2, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[2].toString(), vote2.toString());

            let vote3 = Utils.getBigNumberWithDecimals(10, botDecimals);
            await token.approve(testTopic.address, vote3, { from: better3 });
            await decentralizedOracle.voteResult(0, vote3, { from: better3 });
            assert.equal((await testTopic.getVoteBalances({ from: better3 }))[0].toString(), vote3.toString());
        });
    });

    describe("getFinalResult()", async function() {
        it("returns the final result index and name", async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });

            let finalResultIndex = 1;
            await centralizedOracle.setResult(finalResultIndex, { from: oracle });
            assert.isTrue(await testTopic.resultSet.call());

            var finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], finalResultIndex);
            assert.equal(finalResult[1], testTopicParams._resultNames[finalResultIndex]);
            assert.isFalse(finalResult[2]);

            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);
            await blockHeightManager.mineTo(await decentralizedOracle.arbitrationEndBlock.call());
            await decentralizedOracle.finalizeResult();

            finalResult = await testTopic.getFinalResult();
            assert.equal(finalResult[0], finalResultIndex);
            assert.equal(finalResult[1], testTopicParams._resultNames[finalResultIndex]);
            assert.isTrue(finalResult[2]);
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

    describe('calculateTokensWon', async function() {
        let centralizedOracleResult = 2;
        let bet1, bet2, bet3, bet4;
        let vote1, vote2, vote3, vote4, vote5;

        describe('single round', async function() {
            beforeEach(async function() {
                // First round of betting
                let initialBalance = web3.eth.getBalance(testTopic.address).toNumber();

                bet1 = Utils.getBigNumberWithDecimals(13, nativeDecimals);
                await centralizedOracle.bet(0, { from: better1, value: bet1 });
                assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), bet1.toNumber());

                bet2 = Utils.getBigNumberWithDecimals(22, nativeDecimals);
                await centralizedOracle.bet(1, { from: better2, value: bet2 });
                var totalBetBalance = bet1.add(bet2);
                assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

                bet3 = Utils.getBigNumberWithDecimals(30, nativeDecimals);
                await centralizedOracle.bet(centralizedOracleResult, { from: better3, value: bet3 });
                totalBetBalance = bet1.add(bet2).add(bet3);
                assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

                bet4 = Utils.getBigNumberWithDecimals(12, nativeDecimals);
                await centralizedOracle.bet(centralizedOracleResult, { from: better4, value: bet4 });
                totalBetBalance = bet1.add(bet2).add(bet3).add(bet4);
                assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

                assert.equal((await testTopic.totalQtumValue.call()).toString(), totalBetBalance.toString());

                // CentralizedOracle sets result 2
                await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
                assert.isAtLeast(await getBlockNumber(), testTopicParams._bettingEndBlock);
                assert.isBelow(await getBlockNumber(), testTopicParams._resultSettingEndBlock);

                await token.approve(testTopic.address, startingOracleThreshold, { from: oracle });
                assert.equal((await token.allowance(oracle, testTopic.address)).toString(), 
                    startingOracleThreshold.toString());

                await centralizedOracle.setResult(centralizedOracleResult, { from: oracle });
                assert.isTrue((await testTopic.getOracle(0))[1]);
                assert.isTrue(await testTopic.resultSet.call());
                assert.equal((await testTopic.status.call()).toNumber(), statusOracleVoting);
                let finalResult = await testTopic.getFinalResult();
                assert.equal(finalResult[0], centralizedOracleResult);
                assert.equal(finalResult[1], testTopicParams._resultNames[centralizedOracleResult]);
                assert.isFalse(finalResult[2]);

                decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);
            });

            describe('calculateQtumContributorWinnings()', async function() {
                it('returns the QTUM tokens won', async function() {
                    // DecentralizedOracle finalize result
                    let arbitrationEndBlock = await decentralizedOracle.arbitrationEndBlock.call();
                    await blockHeightManager.mineTo(arbitrationEndBlock);
                    assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock.toNumber());
                    
                    await decentralizedOracle.finalizeResult({ from: better1 });
                    assert.isTrue(await decentralizedOracle.finished.call());
                    assert.equal((await testTopic.status.call()).toNumber(), statusCollection);
                    let finalResult = await testTopic.getFinalResult();
                    assert.equal(finalResult[0], centralizedOracleResult);
                    assert.equal(finalResult[1], testTopicParams._resultNames[centralizedOracleResult]);
                    assert.isTrue(finalResult[2]);

                    // Withdrawing: winning result 2 = better3, better4
                    let losingBlockingTokens = bet1.add(bet2);
                    let winningBlockchainTokens = bet3.add(bet4);

                    var winnings = bet3.mul(losingBlockingTokens).div(winningBlockchainTokens).add(bet3);
                    assert.equal((await testTopic.calculateQtumContributorWinnings({ from: better3 })).toString(), 
                        winnings.toString());

                    winnings = bet4.mul(losingBlockingTokens).div(winningBlockchainTokens).add(bet4);
                    assert.equal((await testTopic.calculateQtumContributorWinnings({ from: better4 })).toString(), 
                        winnings.toString());
                });

                it('throws if status is not Status:Collection', async function() {
                    try {
                        await testTopic.calculateQtumContributorWinnings({ from: better3 });
                        assert.fail();
                    } catch(e) {
                        assertInvalidOpcode(e);
                    }
                });
            });

            describe('calculateBotContributorWinnings()', async function() {
                it('returns the BOT tokens won', async function() {
                    // DecentralizedOracle voting under consensusThreshold
                    let vote1 = Utils.getBigNumberWithDecimals(45, botDecimals);
                    await token.approve(testTopic.address, vote1, { from: better1 });
                    assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1.toString());
                    await decentralizedOracle.voteResult(0, vote1, { from: better1 });
                    assert.equal((await testTopic.getVoteBalances({ from: better1 }))[0].toString(), vote1.toString());

                    let vote2 = Utils.getBigNumberWithDecimals(54, botDecimals);
                    await token.approve(testTopic.address, vote2, { from: better2 });
                    assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2.toString());
                    await decentralizedOracle.voteResult(1, vote2, { from: better2 });
                    assert.equal((await testTopic.getVoteBalances({ from: better2 }))[1].toString(), vote2.toString());

                    let totalVoteBalance = startingOracleThreshold.add(vote1).add(vote2);
                    assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
                    assert.equal((await token.balanceOf(testTopic.address)).toString(), 
                        (await testTopic.totalBotValue.call()).toString());

                    // DecentralizedOracle finalize result
                    let arbitrationEndBlock = await decentralizedOracle.arbitrationEndBlock.call();
                    await blockHeightManager.mineTo(arbitrationEndBlock);
                    assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock.toNumber());
                    
                    await decentralizedOracle.finalizeResult({ from: better1 });
                    assert.isTrue(await decentralizedOracle.finished.call());
                    assert.equal((await testTopic.status.call()).toNumber(), statusCollection);
                    assert.equal((await testTopic.getFinalResult())[0].toNumber(), centralizedOracleResult);

                    // Withdrawing: winning result 2 = oracle
                    let losingBotTokens = vote1.add(vote2);
                    let winningTotalContribution = startingOracleThreshold.add(bet3).add(bet4);

                    // better3: 0 BOT votes
                    assert.equal((await testTopic.calculateBotContributorWinnings({ from: better3 })).toString(), 0);

                    // better4: 0 BOT votes        
                    assert.equal((await testTopic.calculateBotContributorWinnings({ from: better4 })).toString(), 0);

                    // oracle: 100 * 99 / 100 = 99 + 100 = 199 BOT tokens won
                    let oracleBotVote = startingOracleThreshold;
                    let totalBotContribution = startingOracleThreshold;
                    winnings = Math.trunc(oracleBotVote.mul(losingBotTokens).div(totalBotContribution).add(oracleBotVote));
                    assert.equal((await testTopic.calculateBotContributorWinnings({ from: oracle })).toString(), 
                        winnings.toString());
                });

                it('throws if status is not Status:Collection', async function() {
                    try {
                        await testTopic.calculateBotContributorWinnings({ from: better3 });
                        assert.fail();
                    } catch(e) {
                        assertInvalidOpcode(e);
                    }
                });
            });
        });

        it('returns the QTUM and BOT for multiple rounds', async function() {
            let consensusThresholdIncrement = await addressManager.consensusThresholdIncrement.call();
            let decentralizedOracle1Result = 0;
            let decentralizedOracle2Result = 2;

            // First round of betting
            let initialBalance = web3.eth.getBalance(testTopic.address).toNumber();

            bet1 = web3.toBigNumber(1234567890);
            await centralizedOracle.bet(0, { from: better1, value: bet1 });
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), bet1);

            bet2 = web3.toBigNumber(2345678901);
            await centralizedOracle.bet(1, { from: better2, value: bet2 });
            var totalBetBalance = bet1.add(bet2);
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

            bet3 = web3.toBigNumber(3047682437);
            await centralizedOracle.bet(centralizedOracleResult, { from: better3, value: bet3 });
            totalBetBalance = bet1.add(bet2).add(bet3);
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

            bet4 = web3.toBigNumber(1218956043);
            await centralizedOracle.bet(centralizedOracleResult, { from: better4, value: bet4 });
            totalBetBalance = bet1.add(bet2).add(bet3).add(bet4);
            assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

            assert.equal((await testTopic.totalQtumValue.call()).toString(), totalBetBalance.toString());

            // CentralizedOracle votes with 100 BOT to set result 2.
            var threshold = startingOracleThreshold;
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            await token.approve(testTopic.address, threshold, { from: oracle });
            await centralizedOracle.setResult(centralizedOracleResult, { from: oracle });

            var totalBotValue = startingOracleThreshold;
            assert.equal((await testTopic.totalBotValue.call()).toString(), totalBotValue.toString());
            assert.equal((await testTopic.getFinalResult())[0], centralizedOracleResult);
            
            // DecentralizedOracle1 voting. Threshold hits and result becomes 0.
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(1))[0]);
            assert.equal((await testTopic.totalBotValue.call()).toString(), threshold.toString());
            assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), 
                startingOracleThreshold.toString());

            let vote1a = web3.toBigNumber(6012345678);
            await token.approve(testTopic.address, vote1a, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1a.toString());
            await decentralizedOracle.voteResult(decentralizedOracle1Result, vote1a, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[decentralizedOracle1Result].toString(), 
                vote1a.toString());

            let vote2a = web3.toBigNumber(5123456789);
            await token.approve(testTopic.address, vote2a, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2a.toString());
            await decentralizedOracle.voteResult(decentralizedOracle1Result, vote2a, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[decentralizedOracle1Result].toString(), 
                vote2a.toString());

            totalBotValue = totalBotValue.add(vote1a).add(vote2a);
            assert.equal((await testTopic.totalBotValue.call()).toString(), totalBotValue.toString());
            assert.equal((await testTopic.getFinalResult())[0], decentralizedOracle1Result);

            // DecentralizedOracle2 voting. Threshold hits and result becomes 2.
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(2))[0]);
            threshold = vote1a.add(vote2a).add(consensusThresholdIncrement);
            assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), threshold.toString());

            let vote3a = web3.toBigNumber(3012345678);
            await token.approve(testTopic.address, vote3a, { from: better3 });
            assert.equal((await token.allowance(better3, testTopic.address)).toString(), vote3a.toString());
            await decentralizedOracle.voteResult(decentralizedOracle2Result, vote3a, { from: better3 });
            assert.equal((await testTopic.getVoteBalances({ from: better3 }))[decentralizedOracle2Result].toString(), 
                vote3a.toString());

            let vote4a = web3.toBigNumber(4087654321);
            await token.approve(testTopic.address, vote4a, { from: better4 });
            assert.equal((await token.allowance(better4, testTopic.address)).toString(), vote4a.toString());
            await decentralizedOracle.voteResult(decentralizedOracle2Result, vote4a, { from: better4 });
            assert.equal((await testTopic.getVoteBalances({ from: better4 }))[decentralizedOracle2Result].toString(), 
                vote4a.toString());

            let vote5a = web3.toBigNumber(5543215678);
            await token.approve(testTopic.address, vote5a, { from: better5 });
            assert.equal((await token.allowance(better5, testTopic.address)).toString(), vote5a.toString());
            await decentralizedOracle.voteResult(decentralizedOracle2Result, vote5a, { from: better5 });
            assert.equal((await testTopic.getVoteBalances({ from: better5 }))[decentralizedOracle2Result].toString(), 
                vote5a.toString());

            totalBotValue = totalBotValue.add(vote3a).add(vote4a).add(vote5a);
            assert.equal((await testTopic.totalBotValue.call()).toString(), totalBotValue.toString());
            assert.equal((await testTopic.getFinalResult())[0], decentralizedOracle2Result);

            // DecentralizedOracle3 voting. Fails and result gets finalized to 2.
            decentralizedOracle = await DecentralizedOracle.at((await testTopic.getOracle(3))[0]);
            threshold = vote3a.add(vote4a).add(vote5a).add(consensusThresholdIncrement);
            assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), threshold.toString());

            let vote1b = web3.toBigNumber(5377777777);
            let totalVote1 = vote1a.add(vote1b);
            await token.approve(testTopic.address, vote1b, { from: better1 });
            assert.equal((await token.allowance(better1, testTopic.address)).toString(), vote1b.toString());
            await decentralizedOracle.voteResult(decentralizedOracle1Result, vote1b, { from: better1 });
            assert.equal((await testTopic.getVoteBalances({ from: better1 }))[decentralizedOracle1Result].toString(), 
                totalVote1.toString());

            let vote2b = web3.toBigNumber(4955555555);
            let totalVote2 = vote2a.add(vote2b);
            await token.approve(testTopic.address, vote2b, { from: better2 });
            assert.equal((await token.allowance(better2, testTopic.address)).toString(), vote2b.toString());
            await decentralizedOracle.voteResult(decentralizedOracle1Result, vote2b, { from: better2 });
            assert.equal((await testTopic.getVoteBalances({ from: better2 }))[decentralizedOracle1Result].toString(), 
                totalVote2.toString());

            // Finalize result 2
            let arbitrationEndBlock = await decentralizedOracle.arbitrationEndBlock.call();
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock.toNumber());

            await decentralizedOracle.finalizeResult({ from: better3 });
            assert.isTrue(await decentralizedOracle.finished.call());
            assert.equal((await testTopic.status.call()).toNumber(), statusCollection);

            // Withdraw winnings: better3, better4, better5, oracle
            let totalQtum = await testTopic.totalQtumValue.call();
            let losersQtum = Math.floor(bet1.add(bet2));
            let winnersQtum = Math.floor(bet3.add(bet4));
            let losersBot = Math.floor(vote1a.add(vote2a).add(vote1b).add(vote2b));
            let winnersBot = Math.floor(startingOracleThreshold.add(vote3a).add(vote4a).add(vote5a));

            // better3 winner
            var expectedQtum = Math.floor(bet3.mul(losersQtum).div(winnersQtum).add(bet3));
            assert.equal((await testTopic.calculateQtumContributorWinnings({ from: better3 })).toString(), 
                expectedQtum.toString());

            var botContribution = vote3a;
            var expectedBot = Math.floor(botContribution.mul(losersBot).div(winnersBot).add(botContribution));
            assert.equal((await testTopic.calculateBotContributorWinnings({ from: better3 })).toString(), 
                expectedBot.toString());

            // better4 winner
            expectedQtum = Math.floor(bet4.mul(losersQtum).div(winnersQtum).add(bet4));
            assert.equal((await testTopic.calculateQtumContributorWinnings({ from: better4 })).toString(), 
                expectedQtum.toString());

            botContribution = vote4a;
            expectedBot = Math.floor(botContribution.mul(losersBot).div(winnersBot).add(botContribution));
            assert.equal((await testTopic.calculateBotContributorWinnings({ from: better4 })).toString(), 
                expectedBot.toString());

            // better5 winner
            assert.equal((await testTopic.calculateQtumContributorWinnings({ from: better5 })).toString(), 0);

            botContribution = vote5a;
            expectedBot = Math.floor(botContribution.mul(losersBot).div(winnersBot).add(botContribution));
            assert.equal((await testTopic.calculateBotContributorWinnings({ from: better5 })).toString(), 
                expectedBot.toString());

            // CentralizedOracle winner
            assert.equal((await testTopic.calculateQtumContributorWinnings({ from: oracle })).toString(), 0);

            botContribution = startingOracleThreshold;
            expectedBot = Math.floor(botContribution.mul(losersBot).div(winnersBot).add(botContribution));
            assert.equal((await testTopic.calculateBotContributorWinnings({ from: oracle })).toString(), 
                expectedBot.toString());

            // better1 loser
            assert.equal((await testTopic.calculateQtumContributorWinnings({ from: better1 })).toString(), 0);
            assert.equal((await testTopic.calculateBotContributorWinnings({ from: better1 })).toString(), 0);

            // better2 loser
            assert.equal((await testTopic.calculateQtumContributorWinnings({ from: better2 })).toString(), 0);
            assert.equal((await testTopic.calculateBotContributorWinnings({ from: better2 })).toString(), 0);
        });
    });
});
