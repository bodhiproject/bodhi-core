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

contract('CentralizedOracle', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);

    const NATIVE_DECIMALS = 8;
    const BOT_DECIMALS = 8;

    const ADMIN = accounts[0];
    const OWNER = accounts[1];
    const ORACLE = accounts[2];
    const USER1 = accounts[3];
    const USER2 = accounts[4];
    const USER3 = accounts[5];
    const USER4 = accounts[6];
    const USER5 = accounts[7];
    const STARTING_ORACLE_THRESHOLD = Utils.getBigNumberWithDecimals(100, BOT_DECIMALS);

    const TOPIC_EVENT_PARAMS = {
        _oracle: ORACLE,
        _name: ["Will Apple stock reach $300 by t", "he end of 2017?"],
        _resultNames: ["first", "second", "third"],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110
    };

    let addressManager;
    let token;
    let topicEvent;
    let centralizedOracle;
    let decentralizedOracle;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        const botBalance = Utils.getBigNumberWithDecimals(1000, BOT_DECIMALS);

        token = await BodhiToken.deployed({ from: ADMIN });
        await token.mintByOwner(OWNER, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(OWNER)).toString(), botBalance.toString());
        await token.mintByOwner(ORACLE, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(ORACLE)).toString(), botBalance.toString());
        await token.mintByOwner(USER1, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER1)).toString(), botBalance.toString());
        await token.mintByOwner(USER2, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER2)).toString(), botBalance.toString());
        await token.mintByOwner(USER3, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER3)).toString(), botBalance.toString());
        await token.mintByOwner(USER4, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER4)).toString(), botBalance.toString());
        await token.mintByOwner(USER5, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER5)).toString(), botBalance.toString());

        addressManager = await AddressManager.deployed({ from: ADMIN });
        await addressManager.setBodhiTokenAddress(token.address, { from: ADMIN });
        assert.equal(await addressManager.bodhiTokenAddress.call(), token.address);

        let eventFactory = await EventFactory.deployed(addressManager.address, { from: ADMIN });
        await addressManager.setEventFactoryAddress(eventFactory.address, { from: ADMIN });
        assert.equal(await addressManager.getEventFactoryAddress(0), eventFactory.address);

        let oracleFactory = await OracleFactory.deployed(addressManager.address, { from: ADMIN });
        await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: ADMIN });
        assert.equal(await addressManager.getOracleFactoryAddress(0), oracleFactory.address);

        let tx = await eventFactory.createTopic(...Object.values(TOPIC_EVENT_PARAMS), { from: OWNER });
        topicEvent = TopicEvent.at(tx.logs[0].args._topicAddress);
        centralizedOracle = CentralizedOracle.at((await topicEvent.oracles.call(0))[0]);
    });

    describe('constructor', async function() {
        it('initializes all the values', async function() {
            assert.equal(await centralizedOracle.owner.call(), topicEvent.address);
            assert.equal(await centralizedOracle.oracle.call(), ORACLE);
            assert.equal(await centralizedOracle.eventAddress.call(), topicEvent.address);
            assert.equal(web3.toUtf8(await centralizedOracle.eventName.call(0)), TOPIC_EVENT_PARAMS._name[0]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventName.call(1)), TOPIC_EVENT_PARAMS._name[1]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(0)), 
                TOPIC_EVENT_PARAMS._resultNames[0]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(1)), 
                TOPIC_EVENT_PARAMS._resultNames[1]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(2)), 
                TOPIC_EVENT_PARAMS._resultNames[2]);
            assert.equal((await centralizedOracle.numOfResults.call()).toNumber(), 3);
            assert.equal(await centralizedOracle.bettingEndBlock.call(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.equal(await centralizedOracle.resultSettingEndBlock.call(), 
                TOPIC_EVENT_PARAMS._resultSettingEndBlock);
            assert.equal((await centralizedOracle.consensusThreshold.call()).toString(), 
                (await addressManager.startingOracleThreshold.call()).toString());
        });

        it('throws if owner is invalid', async function() {
            try {
                await CentralizedOracle.new(0, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if oracle is invalid', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, 0, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if eventAddress is invalid', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, 0, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if eventName is empty', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, [], 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if eventResultNames 0 or 1 are empty', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    [], await topicEvent.numOfResults.call(), TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    ['first'], await topicEvent.numOfResults.call(), TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    ['', 'second'], await topicEvent.numOfResults.call(), TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if numOfResults is 0', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, 0, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if bettingEndBlock is less than or equal to current block', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if resultSettingEndBlock is less than or equal to bettingEndBlock', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._bettingEndBlock - 1, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('fallback function', async function() {
        it('throws upon calling', async function() {
            try {
                await ethAsync.sendTransactionAsync({
                    to: centralizedOracle.address,
                    from: USER1,
                    value: 1
                });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('bet()', async function() {
        it('allows betting', async function() {
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);

            let betAmount = Utils.getBigNumberWithDecimals(1, NATIVE_DECIMALS);
            let betResultIndex = 1;
            await centralizedOracle.bet(betResultIndex, { from: USER1, value: betAmount });

            assert.equal((await centralizedOracle.getTotalBets())[betResultIndex].toString(), betAmount.toString());
            assert.equal((await centralizedOracle.getBetBalances({ from: USER1 }))[betResultIndex].toString(), 
                betAmount.toString());
        });

        it('throws if resultIndex is invalid', async function() {
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);

            try {
                await centralizedOracle.bet(3, { from: USER1, value: 1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if the block is at the bettingEndBlock', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            
            try {
                await centralizedOracle.bet(0, { from: USER1, value: 1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if the bet is 0', async function() {
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            
            try {
                await centralizedOracle.bet(0, { from: USER1, value: 0 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('setResult()', async function() {
        let STARTING_ORACLE_THRESHOLD;

        beforeEach(async function() {
            assert.isFalse(await centralizedOracle.finished.call());
            assert.equal(await centralizedOracle.oracle.call(), ORACLE);

            STARTING_ORACLE_THRESHOLD = await centralizedOracle.consensusThreshold.call();

            await token.approve(topicEvent.address, STARTING_ORACLE_THRESHOLD, { from: ORACLE });
            assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                STARTING_ORACLE_THRESHOLD.toString());
        });

        describe('in valid block', async function() {
            beforeEach(async function() {
                await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
                assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
                assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._resultSettingEndBlock);
            });

            it('sets the result index', async function() {
                let resultIndex = 2;
                await centralizedOracle.setResult(resultIndex, { from: ORACLE });
                assert.isTrue(await centralizedOracle.finished.call());
                assert.equal(await centralizedOracle.resultIndex.call(), resultIndex);
                assert.equal((await centralizedOracle.getTotalVotes())[resultIndex].toString(), 
                    STARTING_ORACLE_THRESHOLD.toString());
                assert.equal((await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex].toString(), 
                    STARTING_ORACLE_THRESHOLD.toString());
            });

            it('throws if resultIndex is invalid', async function() {
                try {
                    await centralizedOracle.setResult(3, { from: ORACLE });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if it is already finished', async function() {
                await centralizedOracle.setResult(0, { from: ORACLE });
                assert.isTrue(await centralizedOracle.finished.call());

                await token.approve(topicEvent.address, STARTING_ORACLE_THRESHOLD, { from: ORACLE });
                    assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                        STARTING_ORACLE_THRESHOLD.toString());

                try {
                    await centralizedOracle.setResult(1, { from: ORACLE });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if the sender is not the oracle', async function() {
                await token.approve(topicEvent.address, STARTING_ORACLE_THRESHOLD, { from: USER1 });
                assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), 
                    STARTING_ORACLE_THRESHOLD.toString());

                try {
                    await centralizedOracle.setResult(0, { from: USER1 });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });
        });

        describe('in invalid block', async function() {
            it('throws if block is below the bettingEndBlock', async function() {
                assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);

                try {
                    await centralizedOracle.setResult(0, { from: ORACLE });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });

            it('throws if block is at the resultSettingEndBlock', async function() {
                await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._resultSettingEndBlock);
                assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._resultSettingEndBlock);

                try {
                    await centralizedOracle.setResult(0, { from: ORACLE });
                    assert.fail();
                } catch(e) {
                    assertInvalidOpcode(e);
                }
            });
        });
    });

    describe('getBetBalances()', async function() {
        it('returns the bet balances', async function() {
            let betAmount = Utils.getBigNumberWithDecimals(1, NATIVE_DECIMALS);
            await centralizedOracle.bet(0, { from: USER1, value: betAmount });
            assert.equal((await centralizedOracle.getBetBalances({ from: USER1 }))[0].toString(), 
                betAmount.toString());

            await centralizedOracle.bet(1, { from: USER2, value: betAmount });
            assert.equal((await centralizedOracle.getBetBalances({ from: USER2 }))[1].toString(), 
                betAmount.toString());

            await centralizedOracle.bet(2, { from: USER3, value: betAmount });
            assert.equal((await centralizedOracle.getBetBalances({ from: USER3 }))[2].toString(), 
                betAmount.toString());            
        });
    });

    describe('getTotalBets()', async function() {
        it('returns the total bets', async function() {
            let betAmount = Utils.getBigNumberWithDecimals(1, NATIVE_DECIMALS);
            await centralizedOracle.bet(0, { from: USER1, value: betAmount });
            assert.equal((await centralizedOracle.getTotalBets())[0].toString(), betAmount.toString());

            await centralizedOracle.bet(0, { from: USER2, value: betAmount });
            assert.equal((await centralizedOracle.getTotalBets({ from: USER2 }))[0].toString(), 
                betAmount.mul(2).toString());

            await centralizedOracle.bet(0, { from: USER3, value: betAmount });
            assert.equal((await centralizedOracle.getTotalBets({ from: USER3 }))[0].toString(), 
                betAmount.mul(3).toString());            
        });
    });

    describe('getVoteBalances()', async function() {
        it('returns the vote balances', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._resultSettingEndBlock);

            let STARTING_ORACLE_THRESHOLD = await centralizedOracle.consensusThreshold.call();
            await token.approve(topicEvent.address, STARTING_ORACLE_THRESHOLD, { from: ORACLE });
            assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                STARTING_ORACLE_THRESHOLD.toString());

            let resultIndex = 2;
            await centralizedOracle.setResult(resultIndex, { from: ORACLE });
            assert.equal((await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex].toString(),
                STARTING_ORACLE_THRESHOLD.toString());
        });
    });

    describe('getTotalVotes()', async function() {
        it('returns the total votes', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._resultSettingEndBlock);

            let STARTING_ORACLE_THRESHOLD = await centralizedOracle.consensusThreshold.call();
            await token.approve(topicEvent.address, STARTING_ORACLE_THRESHOLD, { from: ORACLE });
            assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                STARTING_ORACLE_THRESHOLD.toString());

            let resultIndex = 2;
            await centralizedOracle.setResult(resultIndex, { from: ORACLE });
            assert.equal((await centralizedOracle.getTotalVotes())[resultIndex].toString(),
                STARTING_ORACLE_THRESHOLD.toString());          
        });
    });
});
