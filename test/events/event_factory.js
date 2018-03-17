const AddressManager = artifacts.require('./storage/AddressManager.sol');
const EventFactory = artifacts.require('./events/EventFactory.sol');
const TopicEvent = artifacts.require('./events/TopicEvent.sol');
const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const CentralizedOracle = artifacts.require('./oracles/CentralizedOracle.sol');
const TimeMachine = require('../helpers/time_machine');
const SolAssert = require('../helpers/sol_assert');
const Utils = require('../helpers/utils');

const web3 = global.web3;
const assert = require('chai').assert;

function getTopicParams(oracle) {
  const currTime = Utils.getCurrentBlockTime();
  return {
    _oracle: oracle,
    _name: ['Will Apple stock reach $300 by t', 'he end of 2017?'],
    _resultNames: ['first', 'second', 'third'],
    _bettingStartTime: currTime + 1000,
    _bettingEndTime: currTime + 3000,
    _resultSettingStartTime: currTime + 4000,
    _resultSettingEndTime: currTime + 6000,
  };
}

contract('EventFactory', (accounts) => {
  const timeMachine = new TimeMachine(web3);

  const RESULT_INVALID = 'Invalid';
  const NUM_OF_RESULTS = 4; // 3 results + invalid default

  const eventFactoryCreator = accounts[0];
  const topicCreator = accounts[1];

  let addressManager;
  let eventFactory;
  let oracleFactory;
  let topicParams;
  let topic;

  beforeEach(async () => {
    await timeMachine.mine();
    await timeMachine.snapshot();

    addressManager = await AddressManager.deployed({ from: eventFactoryCreator });

    eventFactory = await EventFactory.deployed(addressManager.address, { from: eventFactoryCreator });
    await addressManager.setEventFactoryAddress(eventFactory.address, { from: eventFactoryCreator });
    assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), eventFactory.address);

    oracleFactory = await OracleFactory.deployed(addressManager.address, { from: eventFactoryCreator });
    await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: eventFactoryCreator });
    assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), oracleFactory.address);

    // Send escrow
    

    topicParams = getTopicParams(topicCreator);
    const transaction = await eventFactory.createTopic(...Object.values(topicParams), { from: topicCreator });
    topic = await TopicEvent.at(transaction.logs[0].args._topicAddress);
  });

  afterEach(async () => {
    await timeMachine.revert();
  });

  describe('constructor', () => {
    it('sets all the values', async () => {
      assert.equal(await eventFactory.version.call(), 0);
    });

    it('should store the EventFactory address in AddressManager', async () => {
      const index = await addressManager.getLastEventFactoryIndex();
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(index), eventFactory.address);
    });

    it('saves the correct version number', async () => {
      eventFactory = await EventFactory.new(addressManager.address, { from: eventFactoryCreator });
      await addressManager.setEventFactoryAddress(eventFactory.address, { from: eventFactoryCreator });
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(1), eventFactory.address);
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

  describe('TopicEvent', () => {
    it('initializes all the values of the new topic correctly', async () => {
      assert.equal(await topic.owner.call(), topicCreator);
      assert.equal(web3.toUtf8(await topic.eventName.call(0)), topicParams._name[0]);
      assert.equal(web3.toUtf8(await topic.eventName.call(1)), topicParams._name[1]);
      assert.equal(web3.toUtf8(await topic.eventResults.call(0)), RESULT_INVALID);
      assert.equal(web3.toUtf8(await topic.eventResults.call(1)), topicParams._resultNames[0]);
      assert.equal(web3.toUtf8(await topic.eventResults.call(2)), topicParams._resultNames[1]);
      assert.equal(web3.toUtf8(await topic.eventResults.call(3)), topicParams._resultNames[2]);
      assert.equal((await topic.numOfResults.call()).toNumber(), NUM_OF_RESULTS);

      const centralizedOracle = await CentralizedOracle.at((await topic.oracles.call(0))[0]);
      assert.equal(await centralizedOracle.numOfResults.call(), 4);
      assert.equal(await centralizedOracle.oracle.call(), topicParams._oracle);
      assert.equal(await centralizedOracle.bettingStartTime.call(), topicParams._bettingStartTime);
      assert.equal(await centralizedOracle.bettingEndTime.call(), topicParams._bettingEndTime);
      assert.equal(
        await centralizedOracle.resultSettingStartTime.call(),
        topicParams._resultSettingStartTime,
      );
      assert.equal(await centralizedOracle.resultSettingEndTime.call(), topicParams._resultSettingEndTime);
      assert.equal(
        (await centralizedOracle.consensusThreshold.call()).toString(),
        (await addressManager.startingOracleThreshold.call()).toString(),
      );
    });

    it('stops parsing the results when an empty slot is reached', async () => {
      const results = ['first', 'second', '', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'ten'];
      topicParams = getTopicParams(topicCreator);
      const tx = await eventFactory.createTopic(
        topicParams._oracle, topicParams._name, results, topicParams._bettingStartTime,
        topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
      );
      topic = await TopicEvent.at(tx.logs[0].args._topicAddress);

      assert.equal(web3.toUtf8(await topic.eventResults.call(0)), RESULT_INVALID);
      assert.equal(web3.toUtf8(await topic.eventResults.call(1)), 'first');
      assert.equal(web3.toUtf8(await topic.eventResults.call(2)), 'second');
      assert.equal(web3.toUtf8(await topic.eventResults.call(3)), '');
      assert.equal(web3.toUtf8(await topic.eventResults.call(4)), '');
      assert.equal(web3.toUtf8(await topic.eventResults.call(5)), '');
      assert.equal(web3.toUtf8(await topic.eventResults.call(6)), '');
      assert.equal(web3.toUtf8(await topic.eventResults.call(7)), '');
      assert.equal(web3.toUtf8(await topic.eventResults.call(8)), '');
      assert.equal(web3.toUtf8(await topic.eventResults.call(9)), '');
      assert.equal(web3.toUtf8(await topic.eventResults.call(10)), '');
    });

    it('throws if name is empty', async () => {
      try {
        topicParams = getTopicParams(topicCreator);
        await eventFactory.createTopic(
          topicParams._oracle, [], topicParams._resultNames, topicParams._bettingStartTime,
          topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if resultNames 0 or 1 are empty', async () => {
      try {
        topicParams = getTopicParams(topicCreator);
        await eventFactory.createTopic(
          topicParams._oracle, topicParams._name, [], topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      try {
        topicParams = getTopicParams(topicCreator);
        await eventFactory.createTopic(
          topicParams._oracle, topicParams._name, ['first', ''], topicParams._bettingStartTime,
          topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      try {
        topicParams = getTopicParams(topicCreator);
        await eventFactory.createTopic(
          topicParams._oracle, topicParams._name, ['', 'second'], topicParams._bettingStartTime,
          topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });
});
