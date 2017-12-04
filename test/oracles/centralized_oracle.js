const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');
const BodhiToken = artifacts.require("./tokens/BodhiToken.sol");
const AddressManager = artifacts.require("./storage/AddressManager.sol");
const TopicEvent = artifacts.require("./TopicEvent.sol");
const CentralizedOracle = artifacts.require("./oracles/CentralizedOracle.sol");
const DecentralizedOracle = artifacts.require("./oracles/DecentralizedOracle.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const assertInvalidOpcode = require('../helpers/assert_invalid_opcode');
const Utils = require('../helpers/utils');

contract('CentralizedOracle', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);

    const nativeDecimals = 8;
    const botDecimals = 8;
    const statusBetting = 0;
    const statusOracleVoting = 1;
    const statusCollection = 2;

    const admin = accounts[0];
    const owner = accounts[1];
    const oracle = accounts[2];
    const user1 = accounts[3];
    const user2 = accounts[4];
    const user3 = accounts[5];
    const user4 = accounts[6];
    const user5 = accounts[7];
    const botBalance = Utils.getBigNumberWithDecimals(1000, botDecimals);
    const startingOracleThreshold = Utils.getBigNumberWithDecimals(100, botDecimals);

    const topicEventParams = {
        _owner: owner,
        _centralizedOracle: oracle,
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
        token = await BodhiToken.deployed({ from: admin });
        await token.mintByOwner(owner, botBalance, { from: admin });
        assert.equal((await token.balanceOf(owner)).toString(), botBalance.toString());
        await token.mintByOwner(oracle, botBalance, { from: admin });
        assert.equal((await token.balanceOf(oracle)).toString(), botBalance.toString());
        await token.mintByOwner(user1, botBalance, { from: admin });
        assert.equal((await token.balanceOf(user1)).toString(), botBalance.toString());
        await token.mintByOwner(user2, botBalance, { from: admin });
        assert.equal((await token.balanceOf(user2)).toString(), botBalance.toString());
        await token.mintByOwner(user3, botBalance, { from: admin });
        assert.equal((await token.balanceOf(user3)).toString(), botBalance.toString());
        await token.mintByOwner(user4, botBalance, { from: admin });
        assert.equal((await token.balanceOf(user4)).toString(), botBalance.toString());
        await token.mintByOwner(user5, botBalance, { from: admin });
        assert.equal((await token.balanceOf(user5)).toString(), botBalance.toString());

        addressManager = await AddressManager.deployed({ from: admin });
        await addressManager.setBodhiTokenAddress(token.address, { from: admin });
        assert.equal(await addressManager.bodhiTokenAddress.call(), token.address);

        topicEvent = await TopicEvent.new(...Object.values(topicEventParams), addressManager.address, { from: owner });
        centralizedOracle = await CentralizedOracle.at((await topicEvent.getOracle(0))[0]);
    });

    describe('constructor', async function() {
        it('initializes all the values', async function() {
            assert.equal(await centralizedOracle.owner.call(), topicEvent.address);
            assert.equal(await centralizedOracle.oracle.call(), oracle);
            assert.equal(await centralizedOracle.eventAddress.call(), topicEvent.address);
            assert.equal(await centralizedOracle.getEventName(), topicEventParams._name.join(''));
            assert.equal(await centralizedOracle.getEventResultName(0), topicEventParams._resultNames[0]);
            assert.equal(await centralizedOracle.getEventResultName(1), topicEventParams._resultNames[1]);
            assert.equal(await centralizedOracle.getEventResultName(2), topicEventParams._resultNames[2]);
            assert.equal((await centralizedOracle.numOfResults.call()).toNumber(), 3);
            assert.equal(await centralizedOracle.bettingEndBlock.call(), topicEventParams._bettingEndBlock);
            assert.equal(await centralizedOracle.resultSettingEndBlock.call(), topicEventParams._resultSettingEndBlock);
            assert.equal((await centralizedOracle.consensusThreshold.call()).toString(), 
                (await addressManager.startingOracleThreshold.call()).toString());
        });

        it('throws if owner is invalid', async function() {
            try {
                await CentralizedOracle.new(0, oracle, topicEvent.address, topicEventParams._name, 
                    topicEventParams._resultNames, await topicEvent.numOfResults.call(), 
                    topicEventParams._bettingEndBlock, topicEventParams._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if oracle is invalid', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, 0, topicEvent.address, topicEventParams._name, 
                    topicEventParams._resultNames, await topicEvent.numOfResults.call(), 
                    topicEventParams._bettingEndBlock, topicEventParams._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if eventAddress is invalid', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, oracle, 0, topicEventParams._name, 
                    topicEventParams._resultNames, await topicEvent.numOfResults.call(), 
                    topicEventParams._bettingEndBlock, topicEventParams._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if eventName is empty', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, [], 
                    topicEventParams._resultNames, await topicEvent.numOfResults.call(), 
                    topicEventParams._bettingEndBlock, topicEventParams._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if eventResultNames 0 or 1 are empty', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, topicEventParams._name, 
                    [], await topicEvent.numOfResults.call(), topicEventParams._bettingEndBlock, 
                    topicEventParams._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, topicEventParams._name, 
                    ['first'], await topicEvent.numOfResults.call(), topicEventParams._bettingEndBlock, 
                    topicEventParams._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, topicEventParams._name, 
                    ['', 'second'], await topicEvent.numOfResults.call(), topicEventParams._bettingEndBlock, 
                    topicEventParams._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if numOfResults is 0', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, topicEventParams._name, 
                    topicEventParams._resultNames, 0, topicEventParams._bettingEndBlock, 
                    topicEventParams._resultSettingEndBlock, await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if bettingEndBlock is less than or equal to current block', async function() {
            await blockHeightManager.mineTo(topicEventParams._bettingEndBlock);
            assert.isAtLeast(await getBlockNumber(), topicEventParams._bettingEndBlock);

            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, topicEventParams._name, 
                    topicEventParams._resultNames, await topicEvent.numOfResults.call(), 
                    topicEventParams._bettingEndBlock, topicEventParams._resultSettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if resultSettingEndBlock is less than or equal to bettingEndBlock', async function() {
            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, topicEventParams._name, 
                    topicEventParams._resultNames, await topicEvent.numOfResults.call(), 
                    topicEventParams._bettingEndBlock, topicEventParams._bettingEndBlock, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }

            try {
                await CentralizedOracle.new(topicEvent.address, oracle, topicEvent.address, topicEventParams._name, 
                    topicEventParams._resultNames, await topicEvent.numOfResults.call(), 
                    topicEventParams._bettingEndBlock, topicEventParams._bettingEndBlock - 1, 
                    await addressManager.startingOracleThreshold.call());
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });
});
