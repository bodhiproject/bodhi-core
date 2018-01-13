const AddressManager = artifacts.require('./storage/AddressManager.sol');
const EventFactory = artifacts.require('./events/EventFactory.sol');
const TopicEvent = artifacts.require('./events/TopicEvent.sol');
const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const CentralizedOracle = artifacts.require('./oracles/CentralizedOracle.sol');
const BlockHeightManager = require('../helpers/block_height_manager');
const SolAssert = require('../helpers/sol_assert');
const Utils = require('../helpers/utils');

const web3 = global.web3;
const assert = require('chai').assert;

contract('EventFactory', (accounts) => {
  const blockHeightManager = new BlockHeightManager(web3);
  const RESULT_INVALID = 'Invalid';
  const TOPIC_PARAMS = {
    _oracle: accounts[1],
    _name: ['Will Apple stock reach $300 by t', 'he end of 2017?'],
    _resultNames: ['first', 'second', 'third'],
    _bettingStartBlock: 40,
    _bettingEndBlock: 60,
    _resultSettingStartBlock: 70,
    _resultSettingEndBlock: 90,
  };
  const NUM_OF_RESULTS = 4; // 3 results + invalid default

  let addressManager;
  let eventFactory;
  const eventFactoryCreator = accounts[0];
  let oracleFactory;
  let topic;
  const topicCreator = accounts[1];

  beforeEach(blockHeightManager.snapshot);
  afterEach(blockHeightManager.revert);

  beforeEach(async () => {
    addressManager = await AddressManager.deployed({ from: eventFactoryCreator });

    eventFactory = await EventFactory.deployed(addressManager.address, { from: eventFactoryCreator });
    await addressManager.setEventFactoryAddress(eventFactory.address, { from: eventFactoryCreator });
    assert.equal(await addressManager.getEventFactoryAddress(0), eventFactory.address);

    oracleFactory = await OracleFactory.deployed(addressManager.address, { from: eventFactoryCreator });
    await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: eventFactoryCreator });
    assert.equal(await addressManager.getOracleFactoryAddress(0), oracleFactory.address);

    const transaction = await eventFactory.createTopic(...Object.values(TOPIC_PARAMS), { from: topicCreator });
    topic = await TopicEvent.at(transaction.logs[0].args._topicAddress);
  });

  describe('constructor', async () => {
    it('sets all the values', async () => {
      assert.equal(await eventFactory.version.call(), 0);
    });

    it('should store the EventFactory address in AddressManager', async () => {
      const index = await addressManager.getLastEventFactoryIndex();
      assert.equal(await addressManager.getEventFactoryAddress(index), eventFactory.address);
    });

    it('saves the correct version number', async () => {
      eventFactory = await EventFactory.new(addressManager.address, { from: eventFactoryCreator });
      await addressManager.setEventFactoryAddress(eventFactory.address, { from: eventFactoryCreator });
      assert.equal(await addressManager.getEventFactoryAddress(1), eventFactory.address);
      assert.equal(await eventFactory.version.call(), 1);
    });

    it('throws if the AddressManager address is invalid', async () => {
      try {
        await EventFactory.new(0, { from: eventFactoryCreator });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('TopicEvent', async () => {
    it('initializes all the values of the new topic correctly', async () => {
      assert.equal(await topic.owner.call(), topicCreator);
      assert.equal(web3.toUtf8(await topic.eventName.call(0)), TOPIC_PARAMS._name[0]);
      assert.equal(web3.toUtf8(await topic.eventName.call(1)), TOPIC_PARAMS._name[1]);
      assert.equal(web3.toUtf8(await topic.eventResults.call(0)), RESULT_INVALID);
      assert.equal(web3.toUtf8(await topic.eventResults.call(1)), TOPIC_PARAMS._resultNames[0]);
      assert.equal(web3.toUtf8(await topic.eventResults.call(2)), TOPIC_PARAMS._resultNames[1]);
      assert.equal(web3.toUtf8(await topic.eventResults.call(3)), TOPIC_PARAMS._resultNames[2]);
      assert.equal((await topic.numOfResults.call()).toNumber(), NUM_OF_RESULTS);

      const centralizedOracle = await CentralizedOracle.at((await topic.oracles.call(0))[0]);
      assert.equal(await centralizedOracle.numOfResults.call(), 4);
      assert.equal(await centralizedOracle.oracle.call(), TOPIC_PARAMS._oracle);
      assert.equal(await centralizedOracle.bettingStartBlock.call(), TOPIC_PARAMS._bettingStartBlock);
      assert.equal(await centralizedOracle.bettingEndBlock.call(), TOPIC_PARAMS._bettingEndBlock);
      assert.equal(
        await centralizedOracle.resultSettingStartBlock.call(),
        TOPIC_PARAMS._resultSettingStartBlock,
      );
      assert.equal(await centralizedOracle.resultSettingEndBlock.call(), TOPIC_PARAMS._resultSettingEndBlock);
      assert.equal(
        (await centralizedOracle.consensusThreshold.call()).toString(),
        (await addressManager.startingOracleThreshold.call()).toString(),
      );
    });

    it('does not allow recreating the same topic twice', async () => {
      assert.isTrue(await eventFactory.doesTopicExist(
        TOPIC_PARAMS._name, TOPIC_PARAMS._resultNames,
        TOPIC_PARAMS._bettingStartBlock, TOPIC_PARAMS._bettingEndBlock,
        TOPIC_PARAMS._resultSettingStartBlock, TOPIC_PARAMS._resultSettingEndBlock,
      ));
      try {
        await eventFactory.createTopic(...Object.values(TOPIC_PARAMS), { from: topicCreator });
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });
});
