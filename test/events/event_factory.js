const AddressManager = artifacts.require("./storage/AddressManager.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const assertInvalidOpcode = require('../helpers/assert_invalid_opcode');
const Utils = require('../helpers/utils');
const web3 = global.web3;
const assert = require('chai').assert;

contract('EventFactory', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const testTopicParams = {
        _oracle: accounts[1],
        _name: ['Will Apple stock reach $300 by t', 'he end of 2017?'],
        _resultNames: ['first', 'second', 'third'],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110
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
        oracleFactory = await OracleFactory.deployed(addressManager.address, { from: eventFactoryCreator });
        
        let transaction = await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
        topic = await TopicEvent.at(transaction.logs[0].args._topicAddress);
    });

    describe('constructor', async function() {
        it('should store the EventFactory address in AddressManager', async function() {
            let index = await addressManager.getLastEventFactoryIndex();
            assert.equal(await addressManager.getEventFactoryAddress(index), eventFactory.address);
        });

        it('throws if the AddressManager address is invalid', async function() {
            try {
                await EventFactory.new(0, { from: eventFactoryCreator });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('TopicEvent:', async function() {
        it('initializes all the values of the new topic correctly', async function() {
            assert.equal(await topic.owner.call(), topicCreator);
            assert.equal((await topic.getOracle(0))[0], testTopicParams._oracle);
            assert.equal(await topic.getEventName(), testTopicParams._name.join(''));
            assert.equal(web3.toUtf8(await topic.resultNames.call(0)), testTopicParams._resultNames[0]);
            assert.equal(web3.toUtf8(await topic.resultNames.call(1)), testTopicParams._resultNames[1]);
            assert.equal(web3.toUtf8(await topic.resultNames.call(2)), testTopicParams._resultNames[2]);
            assert.equal((await topic.numOfResults.call()).toNumber(), 3);
            assert.equal(await topic.bettingEndBlock.call(), testTopicParams._bettingEndBlock);
            assert.equal(await topic.resultSettingEndBlock.call(), testTopicParams._resultSettingEndBlock);
        });

        it('does not allow recreating the same topic twice', async function() {
            assert.isTrue(await eventFactory.doesTopicExist(testTopicParams._name, testTopicParams._resultNames,
                testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock));
            try {
                await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });
});
