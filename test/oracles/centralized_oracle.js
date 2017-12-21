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
const SolAssert = require('../helpers/sol_assert');
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

    const TOPIC_EVENT_PARAMS = {
        _oracle: ORACLE,
        _name: ["Will Apple stock reach $300 by t", "he end of 2017?"],
        _resultNames: ["first", "second", "third"],
        _bettingStartBlock: 40,
        _bettingEndBlock: 60,
        _resultSettingStartBlock: 70,
        _resultSettingEndBlock: 90
    };

    let addressManager;
    let token;
    let topicEvent;
    let centralizedOracle;
    let decentralizedOracle;
    let startingOracleThreshold;

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

        startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
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
            assert.equal(await centralizedOracle.bettingStartBlock.call(), TOPIC_EVENT_PARAMS._bettingStartBlock);
            assert.equal(await centralizedOracle.bettingEndBlock.call(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.equal(await centralizedOracle.resultSettingStartBlock.call(), 
                TOPIC_EVENT_PARAMS._resultSettingStartBlock);
            assert.equal(await centralizedOracle.resultSettingEndBlock.call(), 
                TOPIC_EVENT_PARAMS._resultSettingEndBlock);
            assert.equal(startingOracleThreshold.toString(), 
                (await addressManager.startingOracleThreshold.call()).toString());
        });

        it('throws if owner is invalid', async function() {
            try {
                await CentralizedOracle.new(0, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if oracle is invalid', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, 0, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock,  
                    startingOracleThreshold);
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if eventAddress is invalid', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, 0, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if eventName is empty', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, [], 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if eventResultNames 0 or 1 are empty', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    [], await topicEvent.numOfResults.call(), TOPIC_EVENT_PARAMS._bettingStartBlock, 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    ['first'], await topicEvent.numOfResults.call(), TOPIC_EVENT_PARAMS._bettingStartBlock, 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    ['', 'second'], await topicEvent.numOfResults.call(), TOPIC_EVENT_PARAMS._bettingStartBlock, 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock,  startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if numOfResults is 0', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, 0, TOPIC_EVENT_PARAMS._bettingStartBlock, 
                    TOPIC_EVENT_PARAMS._bettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if bettingEndBlock is <= bettingStartBlock', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingStartBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if resultSettingStartBlock is < bettingEndBlock', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);

            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._bettingEndBlock - 1, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if resultSettingEndBlock is <= resultSettingStartBlock', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingEndBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 
                    startingOracleThreshold);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if consensusThreshold == 0', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, ORACLE, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, await topicEvent.numOfResults.call(), 
                    TOPIC_EVENT_PARAMS._bettingStartBlock, TOPIC_EVENT_PARAMS._bettingEndBlock, 
                    TOPIC_EVENT_PARAMS._resultSettingStartBlock, TOPIC_EVENT_PARAMS._resultSettingEndBlock, 0);
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
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
                SolAssert.assertRevert(e);
            }
        });
    });

    describe('bet()', async function() {
        it('allows betting', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingStartBlock); 
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingStartBlock);
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
                SolAssert.assertRevert(e);
            }
        });

        it('throws if current block is < bettingStartBlock', async function() {
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingStartBlock);
            
            try {
                await centralizedOracle.bet(0, { from: USER1, value: 1 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if current block is >= bettingEndBlock', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            
            try {
                await centralizedOracle.bet(0, { from: USER1, value: 1 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if the bet is 0', async function() {
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            
            try {
                await centralizedOracle.bet(0, { from: USER1, value: 0 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });
    });

    describe('setResult()', async function() {
        beforeEach(async function() {
            assert.isFalse(await centralizedOracle.finished.call());
            assert.equal(await centralizedOracle.oracle.call(), ORACLE);

            await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
            assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                startingOracleThreshold.toString());
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
                    startingOracleThreshold.toString());
                assert.equal((await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex].toString(), 
                    startingOracleThreshold.toString());
            });

            it('allows anyone to set the result if current block >= resultSettingEndBlock', async function() {
                await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._resultSettingEndBlock);
                assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._resultSettingEndBlock);

                await token.approve(topicEvent.address, startingOracleThreshold, { from: USER1 });
                assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), 
                    startingOracleThreshold.toString());

                let resultIndex = 2;
                await centralizedOracle.setResult(resultIndex, { from: USER1 });
                assert.isTrue(await centralizedOracle.finished.call());
                assert.equal(await centralizedOracle.resultIndex.call(), resultIndex);
                assert.equal((await centralizedOracle.getTotalVotes())[resultIndex].toString(), 
                    startingOracleThreshold.toString());
                assert.equal((await centralizedOracle.getVoteBalances({ from: USER1 }))[resultIndex].toString(), 
                    startingOracleThreshold.toString());
            });

            it('throws if resultIndex is invalid', async function() {
                try {
                    await centralizedOracle.setResult(3, { from: ORACLE });
                    assert.fail();
                } catch(e) {
                    SolAssert.assertRevert(e);
                }
            });

            it('throws if it is already finished', async function() {
                await centralizedOracle.setResult(0, { from: ORACLE });
                assert.isTrue(await centralizedOracle.finished.call());

                await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
                    assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                        startingOracleThreshold.toString());

                try {
                    await centralizedOracle.setResult(1, { from: ORACLE });
                    assert.fail();
                } catch(e) {
                    SolAssert.assertRevert(e);
                }
            });

            it('throws if the sender is not the oracle and < resultSettingEndBlock', async function() {
                await token.approve(topicEvent.address, startingOracleThreshold, { from: USER1 });
                assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), 
                    startingOracleThreshold.toString());

                try {
                    await centralizedOracle.setResult(0, { from: USER1 });
                    assert.fail();
                } catch(e) {
                    SolAssert.assertRevert(e);
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
                    SolAssert.assertRevert(e);
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

            let startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
            await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
            assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                startingOracleThreshold.toString());

            let resultIndex = 2;
            await centralizedOracle.setResult(resultIndex, { from: ORACLE });
            assert.equal((await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex].toString(),
                startingOracleThreshold.toString());
        });
    });

    describe('getTotalVotes()', async function() {
        it('returns the total votes', async function() {
            await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
            assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._resultSettingEndBlock);

            let startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
            await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
            assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
                startingOracleThreshold.toString());

            let resultIndex = 2;
            await centralizedOracle.setResult(resultIndex, { from: ORACLE });
            assert.equal((await centralizedOracle.getTotalVotes())[resultIndex].toString(),
                startingOracleThreshold.toString());          
        });
    });
});
