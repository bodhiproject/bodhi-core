const AddressManager = artifacts.require("./storage/AddressManager.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const CentralizedOracle = artifacts.require("./oracles/CentralizedOracle.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const SolAssert = require('../helpers/sol_assert');
const Utils = require('../helpers/utils');
const web3 = global.web3;
const assert = require('chai').assert;

contract('EventFactory', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const testTopicParams = {
        _oracle: accounts[1],
        _name: ['Will Apple stock reach $300 by t', 'he end of 2017?'],
        _resultNames: ['first', 'second', 'third'],
        _bettingStartBlock: 40,
        _bettingEndBlock: 60,
        _resultSettingStartBlock: 70,
        _resultSettingEndBlock: 90
    };

    let addressManager;
    let eventFactory;
    let eventFactoryCreator = accounts[0];
    let oracleFactory;
    let topic;
    let topicCreator = accounts[1];

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        addressManager = await AddressManager.deployed({ from: eventFactoryCreator });
        
        eventFactory = await EventFactory.deployed(addressManager.address, { from: eventFactoryCreator });
        await addressManager.setEventFactoryAddress(eventFactory.address, { from: eventFactoryCreator });
        assert.equal(await addressManager.getEventFactoryAddress(0), eventFactory.address);

        oracleFactory = await OracleFactory.deployed(addressManager.address, { from: eventFactoryCreator });
        await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: eventFactoryCreator });
        assert.equal(await addressManager.getOracleFactoryAddress(0), oracleFactory.address);
        
        let transaction = await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
        topic = await TopicEvent.at(transaction.logs[0].args._topicAddress);
    });

    describe('constructor', async function() {
        it('sets all the values', async function() {
            assert.equal(await eventFactory.version.call(), 0);
        });

        it('should store the EventFactory address in AddressManager', async function() {
            let index = await addressManager.getLastEventFactoryIndex();
            assert.equal(await addressManager.getEventFactoryAddress(index), eventFactory.address);
        });

        it('saves the correct version number', async function() {
            eventFactory = await EventFactory.new(addressManager.address, { from: eventFactoryCreator });
            await addressManager.setEventFactoryAddress(eventFactory.address, { from: eventFactoryCreator });
            assert.equal(await addressManager.getEventFactoryAddress(1), eventFactory.address);
            assert.equal(await eventFactory.version.call(), 1);
        });

        it('throws if the AddressManager address is invalid', async function() {
            try {
                await EventFactory.new(0, { from: eventFactoryCreator });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });
    });

    describe('TopicEvent', async function() {
        it('initializes all the values of the new topic correctly', async function() {
            assert.equal(await topic.owner.call(), topicCreator);
            assert.equal(web3.toUtf8(await topic.name.call(0)), testTopicParams._name[0]);
            assert.equal(web3.toUtf8(await topic.name.call(1)), testTopicParams._name[1]);
            assert.equal(web3.toUtf8(await topic.resultNames.call(0)), testTopicParams._resultNames[0]);
            assert.equal(web3.toUtf8(await topic.resultNames.call(1)), testTopicParams._resultNames[1]);
            assert.equal(web3.toUtf8(await topic.resultNames.call(2)), testTopicParams._resultNames[2]);
            assert.equal((await topic.numOfResults.call()).toNumber(), 3);

            let centralizedOracle = await CentralizedOracle.at((await topic.oracles.call(0))[0]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventName.call(0)), testTopicParams._name[0]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventName.call(1)), testTopicParams._name[1]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(0)), testTopicParams._resultNames[0]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(1)), testTopicParams._resultNames[1]);
            assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(2)), testTopicParams._resultNames[2]);
            assert.equal(await centralizedOracle.numOfResults.call(), 3);
            assert.equal(await centralizedOracle.bettingStartBlock.call(), testTopicParams._bettingStartBlock);
            assert.equal(await centralizedOracle.bettingEndBlock.call(), testTopicParams._bettingEndBlock);
            assert.equal(await centralizedOracle.resultSettingStartBlock.call(), 
                testTopicParams._resultSettingStartBlock);
            assert.equal(await centralizedOracle.resultSettingEndBlock.call(), testTopicParams._resultSettingEndBlock);
            assert.equal((await centralizedOracle.consensusThreshold.call()).toString(), 
                (await addressManager.startingOracleThreshold.call()).toString());
        });

        it('does not allow recreating the same topic twice', async function() {
            assert.isTrue(await eventFactory.doesTopicExist(testTopicParams._name, testTopicParams._resultNames,
                testTopicParams._bettingStartBlock, testTopicParams._bettingEndBlock, 
                testTopicParams._resultSettingStartBlock, testTopicParams._resultSettingEndBlock));
            try {
                await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });
    });
});
