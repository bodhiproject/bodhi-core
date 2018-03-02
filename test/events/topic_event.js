const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');

const BodhiToken = artifacts.require('./tokens/BodhiToken.sol');
const AddressManager = artifacts.require('./storage/AddressManager.sol');
const EventFactory = artifacts.require('./events/EventFactory.sol');
const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const TopicEvent = artifacts.require('./TopicEvent.sol');
const CentralizedOracle = artifacts.require('./oracles/CentralizedOracle.sol');
const DecentralizedOracle = artifacts.require('./oracles/DecentralizedOracle.sol');
const TimeMachine = require('../helpers/time_machine');
const SolAssert = require('../helpers/sol_assert');
const Utils = require('../helpers/utils');

const ethAsync = bluebird.promisifyAll(web3.eth);

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

contract('TopicEvent', (accounts) => {
  const timeMachine = new TimeMachine(web3);

  const NATIVE_DECIMALS = 8;
  const BOT_DECIMALS = 8;
  const STATUS_VOTING = 1;
  const STATUS_COLLECTION = 2;
  const RESULT_INVALID = 'Invalid';
  const CORACLE_THRESHOLD = Utils.getBigNumberWithDecimals(100, BOT_DECIMALS);

  const ADMIN = accounts[0];
  const OWNER = accounts[1];
  const ORACLE = accounts[2];
  const USER1 = accounts[3];
  const USER2 = accounts[4];
  const USER3 = accounts[5];
  const USER4 = accounts[6];
  const USER5 = accounts[7];

  const INVALID_RESULT_INDEX = 4;

  let token;
  let addressManager;
  let eventFactory;
  let topicParams;
  let testTopic;
  let centralizedOracle;
  let decentralizedOracle;

  before(async () => {
    // Fund accounts with this amount
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

    eventFactory = await EventFactory.deployed(addressManager.address, { from: ADMIN });
    await addressManager.setEventFactoryAddress(eventFactory.address, { from: ADMIN });
    assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), eventFactory.address);

    const oracleFactory = await OracleFactory.deployed(addressManager.address, { from: ADMIN });
    await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: ADMIN });
    assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), oracleFactory.address);
  });

  beforeEach(async () => {
    await timeMachine.mine();
    await timeMachine.snapshot();

    topicParams = getTopicParams(ORACLE);
    const tx = await eventFactory.createTopic(...Object.values(topicParams), { from: OWNER });
    testTopic = TopicEvent.at(tx.logs[0].args._topicAddress);

    centralizedOracle = CentralizedOracle.at((await testTopic.oracles.call(0))[0]);
  });

  afterEach(async () => {
    await timeMachine.revert();
  });

  describe('constructor', () => {
    const resultNames = ['Invalid', 'first', 'second', 'third'];
    const numOfResults = 4;

    it('initializes all the values', async () => {
      assert.equal(await testTopic.owner.call(), OWNER);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(0)), topicParams._name[0]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(1)), topicParams._name[1]);
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(0)), RESULT_INVALID);
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(1)), topicParams._resultNames[0]);
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(2)), topicParams._resultNames[1]);
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(3)), topicParams._resultNames[2]);
      assert.equal((await testTopic.numOfResults.call()).toNumber(), numOfResults);

      assert.equal(await centralizedOracle.numOfResults.call(), numOfResults);
      assert.equal(await centralizedOracle.oracle.call(), topicParams._oracle);
      assert.equal(
        (await centralizedOracle.bettingStartTime.call()).toString(),
        topicParams._bettingStartTime.toString(),
      );
      assert.equal(
        (await centralizedOracle.bettingEndTime.call()).toString(),
        topicParams._bettingEndTime.toString(),
      );
      assert.equal(
        (await centralizedOracle.resultSettingStartTime.call()).toString(),
        topicParams._resultSettingStartTime.toString(),
      );
      assert.equal(
        (await centralizedOracle.resultSettingEndTime.call()).toString(),
        topicParams._resultSettingEndTime.toString(),
      );
      assert.equal(
        (await centralizedOracle.consensusThreshold.call()).toString(),
        (await addressManager.startingOracleThreshold.call()).toString(),
      );
    });

    it('can handle a long name using all 10 array slots', async () => {
      const name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef'];

      topicParams = getTopicParams(ORACLE);
      testTopic = await TopicEvent.new(
        0, OWNER, topicParams._oracle, name, resultNames, numOfResults, topicParams._bettingStartTime,
        topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        addressManager.address,
      );

      assert.equal(web3.toUtf8(await testTopic.eventName.call(0)), name[0]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(1)), name[1]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(2)), name[2]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(3)), name[3]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(4)), name[4]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(5)), name[5]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(6)), name[6]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(7)), name[7]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(8)), name[8]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(9)), name[9]);
    });

    it('should only concatenate first 10 array slots of the name array', async () => {
      const name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef'];
      topicParams = getTopicParams(ORACLE);
      testTopic = await TopicEvent.new(
        0, OWNER, topicParams._oracle, name, resultNames, numOfResults, topicParams._bettingStartTime,
        topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        addressManager.address,
      );

      assert.equal(web3.toUtf8(await testTopic.eventName.call(0)), name[0]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(1)), name[1]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(2)), name[2]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(3)), name[3]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(4)), name[4]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(5)), name[5]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(6)), name[6]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(7)), name[7]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(8)), name[8]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(9)), name[9]);
    });

    it('should allow a space as the last character of a name array item', async () => {
      const name = ['abcdefghijklmnopqrstuvwxyzabcde ', 'fghijklmnopqrstuvwxyz'];
      topicParams = getTopicParams(ORACLE);
      testTopic = await TopicEvent.new(
        0, OWNER, topicParams._oracle, name, resultNames, numOfResults, topicParams._bettingStartTime,
        topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        addressManager.address,
      );
      assert.equal(web3.toUtf8(await testTopic.eventName.call(0)), name[0]);
      assert.equal(web3.toUtf8(await testTopic.eventName.call(1)), name[1]);
    });

    it(
      'should allow a space as the first character if the next character is not empty in a name array item',
      async () => {
        const name = ['abcdefghijklmnopqrstuvwxyzabcdef', ' ghijklmnopqrstuvwxyz'];
        topicParams = getTopicParams(ORACLE);
        testTopic = await TopicEvent.new(
          0, OWNER, topicParams._oracle, name, resultNames, numOfResults, topicParams._bettingStartTime,
          topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.equal(web3.toUtf8(await testTopic.eventName.call(0)), name[0]);
        assert.equal(web3.toUtf8(await testTopic.eventName.call(1)), name[1]);
      },
    );

    it('can handle using all 11 results', async () => {
      const results = [RESULT_INVALID, 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
        'ninth', 'ten'];
      topicParams = getTopicParams(ORACLE);
      testTopic = await TopicEvent.new(
        0, OWNER, topicParams._oracle, topicParams._name, results, 11,
        topicParams._bettingStartTime, topicParams._bettingEndTime,
        topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        addressManager.address,
      );

      assert.equal(web3.toUtf8(await testTopic.eventResults.call(0)), RESULT_INVALID);
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(1)), 'first');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(2)), 'second');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(3)), 'third');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(4)), 'fourth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(5)), 'fifth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(6)), 'sixth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(7)), 'seventh');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(8)), 'eighth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(9)), 'ninth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(10)), 'ten');
    });

    it('should only set the first 10 results', async () => {
      const results = [RESULT_INVALID, 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
        'ninth', 'ten', 'eleven'];
      topicParams = getTopicParams(ORACLE);
      testTopic = await TopicEvent.new(
        0, OWNER, topicParams._oracle, topicParams._name, results, 11,
        topicParams._bettingStartTime, topicParams._bettingEndTime,
        topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
        addressManager.address,
      );

      assert.equal(web3.toUtf8(await testTopic.eventResults.call(0)), RESULT_INVALID);
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(1)), 'first');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(2)), 'second');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(3)), 'third');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(4)), 'fourth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(5)), 'fifth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(6)), 'sixth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(7)), 'seventh');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(8)), 'eighth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(9)), 'ninth');
      assert.equal(web3.toUtf8(await testTopic.eventResults.call(10)), 'ten');

      try {
        await testTopic.eventResults.call(11);
        assert.fail();
      } catch (e) {
        SolAssert.assertInvalidOpcode(e);
      }
    });

    it('throws if owner address is invalid', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, 0, topicParams._oracle, topicParams._name, topicParams._resultNames, numOfResults,
          topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if oracle address is invalid', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, 0, topicParams._name, topicParams._resultNames, numOfResults, topicParams._bettingStartTime,
          topicParams._bettingEndTime, topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if AddressManager address is invalid', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, topicParams._centralizedOracle, topicParams._name, topicParams._resultNames, numOfResults,
          topicParams._bettingStartTime, topicParams._bettingEndTime, topicParams._resultSettingStartTime,
          topicParams._resultSettingEndTime, 0,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if name is empty', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, topicParams._centralizedOracle, [], topicParams._resultNames, numOfResults,
          topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if eventResults 0 or 1 are empty', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, topicParams._centralizedOracle, topicParams._name, [], 1,
          topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, topicParams._owner, topicParams._centralizedOracle, topicParams._name,
          ['first'], 2, topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, topicParams._centralizedOracle, topicParams._name, ['', 'second'], 2,
          topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if bettingEndTime is <= bettingStartTime', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, topicParams._centralizedOracle, topicParams._name,
          topicParams._resultNames, numOfResults, topicParams._bettingStartTime, topicParams._bettingStartTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingEndTime,
          addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if resultSettingStartTime is < bettingEndTime', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, topicParams._centralizedOracle, topicParams._name,
          topicParams._resultNames, numOfResults, topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._bettingEndTime - 1, topicParams._resultSettingEndTime, addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if resultSettingEndTime is <= resultSettingStartTime', async () => {
      try {
        topicParams = getTopicParams(ORACLE);
        await TopicEvent.new(
          0, OWNER, topicParams._centralizedOracle, topicParams._name,
          topicParams._resultNames, numOfResults, topicParams._bettingStartTime, topicParams._bettingEndTime,
          topicParams._resultSettingStartTime, topicParams._resultSettingStartTime, addressManager.address,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('fallback function', () => {
    it('throws upon calling', async () => {
      try {
        await ethAsync.sendTransactionAsync({
          to: testTopic.address,
          from: accounts[2],
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('betFromOracle()', () => {
    it('allows users to bet', async () => {
      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      const initialBalance = web3.eth.getBalance(testTopic.address).toNumber();
      const betAmount = Utils.getBigNumberWithDecimals(1, NATIVE_DECIMALS);
      const betResultIndex = 0;
      await centralizedOracle.bet(betResultIndex, {
        from: USER1,
        value: betAmount,
      });

      const newBalance = web3.eth.getBalance(testTopic.address).toNumber();
      const difference = newBalance - initialBalance;
      assert.equal(difference, betAmount);
      assert.equal((await testTopic.totalQtumValue.call()).toString(), betAmount.toString());

      const betBalances = await testTopic.getBetBalances({ from: USER1 });
      assert.equal(betBalances[betResultIndex].toString(), betAmount.toString());
    });

    it('throws on an invalid result index', async () => {
      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      try {
        await centralizedOracle.bet(INVALID_RESULT_INDEX, {
          from: USER1,
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if receiving from an address that is not the CentralizedOracle contract', async () => {
      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      try {
        await testTopic.betFromOracle(USER1, 0, {
          from: USER1,
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws on a bet of 0', async () => {
      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      try {
        await centralizedOracle.bet(0, {
          from: USER1,
          value: 0,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('centralizedOracleSetResult()', () => {
    beforeEach(async () => {
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._resultSettingEndTime);
    });

    it('sets the result and creates a new CentralizedOracle', async () => {
      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      assert.equal(
        (await token.allowance(ORACLE, testTopic.address)).toString(),
        CORACLE_THRESHOLD.toString(),
      );

      try {
        assert.equal((await testTopic.oracles(1))[0], 0);
        assert.fail();
      } catch (e) {
        SolAssert.assertInvalidOpcode(e);
      }

      const finalResultIndex = 1;
      await centralizedOracle.setResult(finalResultIndex, { from: ORACLE });

      assert.isTrue((await testTopic.oracles.call(0))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], finalResultIndex);
      assert.isFalse(finalResult[1]);

      assert.equal((await testTopic.totalBotValue.call()).toString(), CORACLE_THRESHOLD.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), CORACLE_THRESHOLD.toString());

      decentralizedOracle = await testTopic.oracles.call(1);
      assert.notEqual(decentralizedOracle[0], 0);
      assert.isFalse(decentralizedOracle[1]);
    });

    it('throws on an invalid result index', async () => {
      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      assert.equal((await token.allowance(ORACLE, testTopic.address)).toString(), CORACLE_THRESHOLD.toString());

      try {
        assert.equal((await testTopic.oracles.call(1))[0], 0);
        assert.fail();
      } catch (e) {
        SolAssert.assertInvalidOpcode(e);
      }

      try {
        await centralizedOracle.setResult(INVALID_RESULT_INDEX, { from: ORACLE });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if sender is not the CentralizedOracle', async () => {
      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), CORACLE_THRESHOLD.toString());

      try {
        await testTopic.centralizedOracleSetResult(ORACLE, 2, CORACLE_THRESHOLD, { from: ORACLE });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if CentralizedOracle already set the result', async () => {
      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });

      const finalResultIndex = 1;
      await centralizedOracle.setResult(finalResultIndex, { from: ORACLE });

      assert.isTrue((await testTopic.oracles.call(0))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], finalResultIndex);
      assert.isFalse(finalResult[1]);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });

      try {
        await centralizedOracle.setResult(2, { from: ORACLE });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if allowance is < consensusThreshold', async () => {
      const amount = Utils.getBigNumberWithDecimals(99, BOT_DECIMALS);
      await token.approve(testTopic.address, amount, { from: ORACLE });
      assert.equal((await token.allowance(ORACLE, testTopic.address)).toString(), amount.toString());

      try {
        await centralizedOracle.setResult(1, { from: ORACLE });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('voteFromOracle()', () => {
    const firstResultIndex = 1;

    beforeEach(async () => {
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._resultSettingEndTime);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      assert.equal((await token.allowance(ORACLE, testTopic.address)).toString(), CORACLE_THRESHOLD.toString());

      await centralizedOracle.setResult(firstResultIndex, { from: ORACLE });

      assert.isTrue((await testTopic.oracles.call(0))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], firstResultIndex);
      assert.isFalse(finalResult[1]);

      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);
    });

    it('allows votes from DecentralizedOracles', async () => {
      assert.equal((await testTopic.totalBotValue.call()).toString(), CORACLE_THRESHOLD.toString());

      const vote1 = Utils.getBigNumberWithDecimals(20, BOT_DECIMALS);
      await token.approve(testTopic.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal((await testTopic.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

      const vote2 = Utils.getBigNumberWithDecimals(35, BOT_DECIMALS);
      await token.approve(testTopic.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(2, vote2, { from: USER2 });
      assert.equal((await testTopic.getVoteBalances({ from: USER2 }))[2].toString(), vote2.toString());

      const vote3 = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
      await token.approve(testTopic.address, vote3, { from: USER3 });
      assert.equal((await token.allowance(USER3, testTopic.address)).toString(), vote3.toString());
      await decentralizedOracle.voteResult(0, vote3, { from: USER3 });
      assert.equal((await testTopic.getVoteBalances({ from: USER3 }))[0].toString(), vote3.toString());

      const totalVoteBalance = CORACLE_THRESHOLD.add(vote1).add(vote2).add(vote3);
      assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
      assert.equal(
        (await token.balanceOf(testTopic.address)).toString(),
        (await testTopic.totalBotValue.call()).toString(),
      );
    });

    it('throws if voting on an invalid result index', async () => {
      try {
        await decentralizedOracle.voteResult(INVALID_RESULT_INDEX, 1, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if voting from an invalid DecentralizedOracle', async () => {
      const numOfResults = await testTopic.numOfResults.call();
      const lastResultIndex = 1;
      const arbitrationEndTime = Utils.getCurrentBlockTime() + await addressManager.arbitrationLength.call();
      decentralizedOracle = await DecentralizedOracle.new(
        0, OWNER, testTopic.address, numOfResults,
        lastResultIndex, arbitrationEndTime, CORACLE_THRESHOLD, { from: OWNER },
      );

      try {
        await decentralizedOracle.voteResult(2, 1, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if amount is 0', async () => {
      try {
        await decentralizedOracle.voteResult(0, 0, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if allowance is less than the amount', async () => {
      const vote = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
      await token.approve(testTopic.address, vote.sub(1), { from: USER1 });

      try {
        await decentralizedOracle.voteResult(0, vote, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('decentralizedOracleSetResult()', () => {
    const centralizedOracleResultIndex = 1;
    const votingOracle1ResultIndex = 2;
    let votingOracle2;

    beforeEach(async () => {
      // CentralizedOracle sets result
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._resultSettingEndTime);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      assert.equal((await token.allowance(ORACLE, testTopic.address)).toString(), CORACLE_THRESHOLD.toString());

      await centralizedOracle.setResult(centralizedOracleResultIndex, { from: ORACLE });

      assert.isTrue((await testTopic.oracles.call(0))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      assert.equal((await testTopic.getFinalResult())[0], centralizedOracleResultIndex);
      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], centralizedOracleResultIndex);
      assert.isFalse(finalResult[1]);

      // DecentralizedOracle voting
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);

      assert.equal((await testTopic.totalBotValue.call()).toString(), CORACLE_THRESHOLD.toString());

      const vote1 = Utils.getBigNumberWithDecimals(20, BOT_DECIMALS);
      await token.approve(testTopic.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal((await testTopic.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

      const vote2 = Utils.getBigNumberWithDecimals(35, BOT_DECIMALS);
      await token.approve(testTopic.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(0, vote2, { from: USER2 });
      assert.equal((await testTopic.getVoteBalances({ from: USER2 }))[0].toString(), vote2.toString());

      // Verify no DecentralizedOracle at index 2
      try {
        await testTopic.oracles.call(2);
        assert.fail();
      } catch (e) {
        SolAssert.assertInvalidOpcode(e);
      }

      // Winning vote
      const vote3 = CORACLE_THRESHOLD.add(1);
      await token.approve(testTopic.address, vote3, { from: USER3 });
      assert.equal((await token.allowance(USER3, testTopic.address)).toString(), vote3.toString());
      await decentralizedOracle.voteResult(votingOracle1ResultIndex, vote3, { from: USER3 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER3 }))[votingOracle1ResultIndex].toString(),
        vote3.toString(),
      );

      const totalVoteBalance = CORACLE_THRESHOLD.add(vote1).add(vote2).add(vote3);
      assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
      assert.equal(
        (await token.balanceOf(testTopic.address)).toString(),
        (await testTopic.totalBotValue.call()).toString(),
      );
      assert.isAbove(
        (await decentralizedOracle.getTotalVotes())[votingOracle1ResultIndex].toNumber(),
        (await decentralizedOracle.consensusThreshold.call()).toNumber(),
      );
      assert.isTrue(await decentralizedOracle.finished.call());
    });

    it('sets the result and creates a new DecentralizedOracle', async () => {
      assert.isTrue((await testTopic.oracles.call(1))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      assert.equal((await testTopic.getFinalResult())[0], votingOracle1ResultIndex);

      assert.notEqual((await testTopic.oracles.call(2))[0], 0);
      votingOracle2 = await DecentralizedOracle.at((await testTopic.oracles.call(2))[0]);
      assert.equal(await votingOracle2.lastResultIndex.call(), votingOracle1ResultIndex);
    });

    it('throws if setting from invalid DecentralizedOracle', async () => {
      const numOfResults = await testTopic.numOfResults.call();
      const arbitrationEndBlock = Utils.getCurrentBlockTime() + await addressManager.arbitrationLength.call();
      const threshold = (await decentralizedOracle.consensusThreshold.call())
        .add(Utils.getBigNumberWithDecimals(10, BOT_DECIMALS));
      votingOracle2 = await DecentralizedOracle.new(
        0, OWNER, testTopic.address, numOfResults,
        votingOracle1ResultIndex, arbitrationEndBlock, threshold, { from: OWNER },
      );
      assert.notEqual((await testTopic.oracles.call(2))[0], votingOracle2.address);

      const winningVote = threshold.add(1);
      await token.approve(testTopic.address, winningVote, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), winningVote.toString());

      try {
        await votingOracle2.voteResult(0, winningVote, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('finalizeResult()', () => {
    const centralizedOracleResult = 1;

    beforeEach(async () => {
      // CentralizedOracle sets result
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._resultSettingEndTime);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      assert.equal((await token.allowance(ORACLE, testTopic.address)).toString(), CORACLE_THRESHOLD.toString());

      await centralizedOracle.setResult(centralizedOracleResult, { from: ORACLE });

      assert.isTrue((await testTopic.oracles.call(0))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], centralizedOracleResult);
      assert.isFalse(finalResult[1]);

      // DecentralizedOracle voting under consensusThreshold
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);

      const vote1 = Utils.getBigNumberWithDecimals(20, BOT_DECIMALS);
      await token.approve(testTopic.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal((await testTopic.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

      const vote2 = Utils.getBigNumberWithDecimals(35, BOT_DECIMALS);
      await token.approve(testTopic.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(2, vote2, { from: USER2 });
      assert.equal((await testTopic.getVoteBalances({ from: USER2 }))[2].toString(), vote2.toString());

      const vote3 = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
      await token.approve(testTopic.address, vote3, { from: USER3 });
      assert.equal((await token.allowance(USER3, testTopic.address)).toString(), vote3.toString());
      await decentralizedOracle.voteResult(0, vote3, { from: USER3 });
      assert.equal((await testTopic.getVoteBalances({ from: USER3 }))[0].toString(), vote3.toString());

      const totalVoteBalance = CORACLE_THRESHOLD.add(vote1).add(vote2).add(vote3);
      assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
      assert.equal(
        (await token.balanceOf(testTopic.address)).toString(),
        (await testTopic.totalBotValue.call()).toString(),
      );

      // Advance to arbitrationEndTime
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      assert.notEqual((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);
      assert.isFalse(await decentralizedOracle.finished.call());
    });

    it('finalizes the result', async () => {
      await decentralizedOracle.finalizeResult({ from: USER1 });
      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);

      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], centralizedOracleResult);
      assert.isTrue(finalResult[1]);
    });

    it('throws if an invalid DecentralizedOracle tries to finalize the result', async () => {
      const numOfResults = await testTopic.numOfResults.call();
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call())
        .add(await addressManager.arbitrationLength.call());
      const threshold = (await decentralizedOracle.consensusThreshold.call())
        .add(await addressManager.consensusThresholdIncrement.call());
      const votingOracle2 = await DecentralizedOracle.new(
        0, OWNER, testTopic.address, numOfResults,
        centralizedOracleResult, arbitrationEndTime, threshold, { from: OWNER },
      );

      try {
        await votingOracle2.finalizeResult({ from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.isFalse(await votingOracle2.finished.call());
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
    });

    it('throws if the current status is not Status:OracleVoting', async () => {
      await decentralizedOracle.finalizeResult({ from: USER1 });
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);

      try {
        await decentralizedOracle.finalizeResult({ from: USER2 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('withdrawWinnings()', () => {
    let bet1,
      bet2,
      bet3,
      bet4;
    const cOracleResult = 2;
    const dOracle1Result = 1;
    const dOracle2Result = 2;

    beforeEach(async () => {
      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      // First round of betting
      bet1 = web3.toBigNumber(7777777777);
      await centralizedOracle.bet(0, {
        from: USER1,
        value: bet1,
      });
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), bet1.toNumber());
      assert.equal((await testTopic.getBetBalances({ from: USER1 }))[0].toString(), bet1.toString());

      bet2 = web3.toBigNumber(2212345678);
      await centralizedOracle.bet(1, {
        from: USER2,
        value: bet2,
      });
      let totalBetBalance = bet1.add(bet2);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());
      assert.equal((await testTopic.getBetBalances({ from: USER2 }))[1].toString(), bet2.toString());

      bet3 = web3.toBigNumber(3027596457);
      await centralizedOracle.bet(cOracleResult, {
        from: USER3,
        value: bet3,
      });
      totalBetBalance = bet1.add(bet2).add(bet3);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());
      assert.equal(
        (await testTopic.getBetBalances({ from: USER3 }))[cOracleResult].toString(),
        bet3.toString(),
      );

      bet4 = web3.toBigNumber(1298765432);
      await centralizedOracle.bet(cOracleResult, {
        from: USER4,
        value: bet4,
      });
      totalBetBalance = bet1.add(bet2).add(bet3).add(bet4);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());
      assert.equal(
        (await testTopic.getBetBalances({ from: USER4 }))[cOracleResult].toString(),
        bet4.toString(),
      );

      assert.equal((await testTopic.totalQtumValue.call()).toString(), totalBetBalance.toString());

      // CentralizedOracle sets result 2
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._resultSettingEndTime);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      assert.equal((await token.allowance(ORACLE, testTopic.address)).toString(), CORACLE_THRESHOLD.toString());

      await centralizedOracle.setResult(cOracleResult, { from: ORACLE });
      assert.isTrue((await testTopic.oracles.call(0))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], cOracleResult);
      assert.isFalse(finalResult[1]);

      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);
    });

    it('transfers the tokens for a single voting round', async () => {
      // DecentralizedOracle voting under consensusThreshold
      const vote1 = Utils.getBigNumberWithDecimals(20, BOT_DECIMALS);
      await token.approve(testTopic.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal((await testTopic.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

      const vote2 = Utils.getBigNumberWithDecimals(35, BOT_DECIMALS);
      await token.approve(testTopic.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(1, vote2, { from: USER2 });
      assert.equal((await testTopic.getVoteBalances({ from: USER2 }))[1].toString(), vote2.toString());

      const totalVoteBalance = CORACLE_THRESHOLD.add(vote1).add(vote2);
      const totalBotValue = await testTopic.totalBotValue.call();
      assert.equal(totalBotValue.toString(), totalVoteBalance.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), totalBotValue.toString());

      // DecentralizedOracle finalize result
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      await decentralizedOracle.finalizeResult({ from: USER1 });
      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);

      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], cOracleResult);
      assert.isTrue(finalResult[1]);

      // USER3 winner
      let winningsArr = await testTopic.calculateWinnings({ from: USER3 });
      let botWon = winningsArr[0];
      let qtumWon = winningsArr[1];

      let expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
      let expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
      await testTopic.withdrawWinnings({ from: USER3 });
      assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
      assert.isTrue(await testTopic.didWithdraw.call(USER3));

      // USER4 winner
      winningsArr = await testTopic.calculateWinnings({ from: USER4 });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
      expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
      await testTopic.withdrawWinnings({ from: USER4 });
      assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
      assert.isTrue(await testTopic.didWithdraw.call(USER4));

      // ORACLE winner
      winningsArr = await testTopic.calculateWinnings({ from: ORACLE });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
      expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
      await testTopic.withdrawWinnings({ from: ORACLE });
      assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
      assert.isTrue(await testTopic.didWithdraw.call(ORACLE));

      // USER1 loser
      winningsArr = await testTopic.calculateWinnings({ from: USER1 });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      assert.equal(botWon, 0);
      assert.equal(qtumWon, 0);
      await testTopic.withdrawWinnings({ from: USER1 });
      assert.isTrue(await testTopic.didWithdraw.call(USER1));

      // USER2 loser
      winningsArr = await testTopic.calculateWinnings({ from: USER2 });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      assert.equal(botWon, 0);
      assert.equal(qtumWon, 0);
      await testTopic.withdrawWinnings({ from: USER2 });
      assert.isTrue(await testTopic.didWithdraw.call(USER2));
    });

    it('transfers the tokens for a multiple betting/voting rounds', async () => {
      // DecentralizedOracle1 voting hits consensusThreshold
      const vote1a = web3.toBigNumber(6112345678);
      await token.approve(testTopic.address, vote1a, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1a.toString());
      await decentralizedOracle.voteResult(dOracle1Result, vote1a, { from: USER1 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER1 }))[dOracle1Result].toString(),
        vote1a.toString(),
      );

      const vote2 = web3.toBigNumber(3887654322);
      await token.approve(testTopic.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(dOracle1Result, vote2, { from: USER2 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER2 }))[dOracle1Result].toString(),
        vote2.toString(),
      );

      let totalVoteBalance = CORACLE_THRESHOLD.add(vote1a).add(vote2);
      let totalBotValue = await testTopic.totalBotValue.call();
      assert.equal(totalBotValue.toString(), totalVoteBalance.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), totalBotValue.toString());

      // DecentralizedOracle2 voting hits consensusThreshold
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(2))[0]);
      assert.equal(
        (await decentralizedOracle.consensusThreshold.call()).toString(),
        Utils.getBigNumberWithDecimals(110, BOT_DECIMALS).toString(),
      );

      const vote3 = web3.toBigNumber(7373737373);
      await token.approve(testTopic.address, vote3, { from: USER3 });
      assert.equal((await token.allowance(USER3, testTopic.address)).toString(), vote3.toString());
      await decentralizedOracle.voteResult(dOracle2Result, vote3, { from: USER3 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER3 }))[dOracle2Result].toString(),
        vote3.toString(),
      );

      const vote4 = web3.toBigNumber(3626262627);
      await token.approve(testTopic.address, vote4, { from: USER4 });
      assert.equal((await token.allowance(USER4, testTopic.address)).toString(), vote4.toString());
      await decentralizedOracle.voteResult(dOracle2Result, vote4, { from: USER4 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER4 }))[dOracle2Result].toString(),
        vote4.toString(),
      );

      totalVoteBalance = totalVoteBalance.add(vote3).add(vote4);
      totalBotValue = await testTopic.totalBotValue.call();
      assert.equal(totalBotValue.toString(), totalVoteBalance.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), totalBotValue.toString());

      // DecentralizedOracle3 voting under consensusThreshold
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(3))[0]);
      assert.equal(
        (await decentralizedOracle.consensusThreshold.call()).toString(),
        Utils.getBigNumberWithDecimals(120, BOT_DECIMALS).toString(),
      );

      const vote1b = web3.toBigNumber(7135713713);
      await token.approve(testTopic.address, vote1b, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1b.toString());
      await decentralizedOracle.voteResult(dOracle1Result, vote1b, { from: USER1 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER1 }))[dOracle1Result].toString(),
        vote1a.add(vote1b).toString(),
      );

      // DecentralizedOracle finalize result
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      await decentralizedOracle.finalizeResult({ from: USER1 });
      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);

      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], dOracle2Result);
      assert.isTrue(finalResult[1]);

      const expectedQtumValue = bet1.add(bet2).add(bet3).add(bet4);
      assert.equal((await testTopic.totalQtumValue.call()).toString(), expectedQtumValue.toString());
      const expectedBotValue = CORACLE_THRESHOLD.add(vote1a).add(vote1b).add(vote2).add(vote3)
        .add(vote4);
      assert.equal((await testTopic.totalBotValue.call()).toString(), expectedBotValue.toString());

      // USER3 winner withdraw
      let winningsArr = await testTopic.calculateWinnings({ from: USER3 });
      let botWon = winningsArr[0];
      let qtumWon = winningsArr[1];

      let expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
      let expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
      assert.isFalse(await testTopic.didWithdraw.call(USER3));
      await testTopic.withdrawWinnings({ from: USER3 });
      assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
      assert.isTrue(await testTopic.didWithdraw.call(USER3));

      // USER4 winner withdraw
      winningsArr = await testTopic.calculateWinnings({ from: USER4 });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
      expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
      assert.isFalse(await testTopic.didWithdraw.call(USER4));
      await testTopic.withdrawWinnings({ from: USER4 });
      assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
      assert.isTrue(await testTopic.didWithdraw.call(USER4));

      // ORACLE winner withdraw
      winningsArr = await testTopic.calculateWinnings({ from: ORACLE });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      expectedQtum = (await web3.eth.getBalance(testTopic.address)).sub(qtumWon);
      expectedBot = (await token.balanceOf(testTopic.address)).sub(botWon);
      assert.isFalse(await testTopic.didWithdraw.call(ORACLE));
      await testTopic.withdrawWinnings({ from: ORACLE });
      assert.equal((await web3.eth.getBalance(testTopic.address)).toString(), expectedQtum.toString());
      assert.equal((await token.balanceOf(testTopic.address)).toString(), expectedBot.toString());
      assert.isTrue(await testTopic.didWithdraw.call(ORACLE));

      // USER1 loser withdraw
      winningsArr = await testTopic.calculateWinnings({ from: USER1 });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      assert.equal(botWon, 0);
      assert.equal(qtumWon, 0);
      assert.isFalse(await testTopic.didWithdraw.call(USER1));
      await testTopic.withdrawWinnings({ from: USER1 });
      assert.isTrue(await testTopic.didWithdraw.call(USER1));

      // USER2 loser withdraw
      winningsArr = await testTopic.calculateWinnings({ from: USER2 });
      botWon = winningsArr[0];
      qtumWon = winningsArr[1];

      assert.equal(botWon, 0);
      assert.equal(qtumWon, 0);
      assert.isFalse(await testTopic.didWithdraw.call(USER2));
      await testTopic.withdrawWinnings({ from: USER2 });
      assert.isTrue(await testTopic.didWithdraw.call(USER2));
    });

    it('throws if status is not Status:Collection', async () => {
      assert.notEqual((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);
      try {
        await testTopic.withdrawWinnings({ from: ORACLE });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if already withdrawn', async () => {
      // DecentralizedOracle finalize result
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      await decentralizedOracle.finalizeResult({ from: USER1 });
      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);

      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], cOracleResult);
      assert.isTrue(finalResult[1]);

      // Winner withdraw
      await testTopic.withdrawWinnings({ from: USER3 });
      assert.isTrue(await testTopic.didWithdraw.call(USER3));

      try {
        await testTopic.withdrawWinnings({ from: USER3 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      // Loser withdraw
      await testTopic.withdrawWinnings({ from: USER1 });
      assert.isTrue(await testTopic.didWithdraw.call(USER1));

      try {
        await testTopic.withdrawWinnings({ from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('getBetBalances()', () => {
    it('returns the bet balances', async () => {
      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      const bet0 = Utils.getBigNumberWithDecimals(13, NATIVE_DECIMALS);
      await centralizedOracle.bet(0, {
        from: ORACLE,
        value: bet0,
      });

      const bet1 = Utils.getBigNumberWithDecimals(7, NATIVE_DECIMALS);
      await centralizedOracle.bet(1, {
        from: ORACLE,
        value: bet1,
      });

      const bet2 = Utils.getBigNumberWithDecimals(4, NATIVE_DECIMALS);
      await centralizedOracle.bet(2, {
        from: ORACLE,
        value: bet2,
      });

      const betBalances = await testTopic.getBetBalances({ from: ORACLE });
      assert.equal(betBalances[0].toString(), bet0.toString());
      assert.equal(betBalances[1].toString(), bet1.toString());
      assert.equal(betBalances[2].toString(), bet2.toString());
    });
  });

  describe('getVoteBalances()', () => {
    it('returns the vote balances', async () => {
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      await centralizedOracle.setResult(1, { from: ORACLE });
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);

      const vote1 = Utils.getBigNumberWithDecimals(20, BOT_DECIMALS);
      await token.approve(testTopic.address, vote1, { from: USER1 });
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal((await testTopic.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

      const vote2 = Utils.getBigNumberWithDecimals(35, BOT_DECIMALS);
      await token.approve(testTopic.address, vote2, { from: USER2 });
      await decentralizedOracle.voteResult(2, vote2, { from: USER2 });
      assert.equal((await testTopic.getVoteBalances({ from: USER2 }))[2].toString(), vote2.toString());

      const vote3 = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
      await token.approve(testTopic.address, vote3, { from: USER3 });
      await decentralizedOracle.voteResult(0, vote3, { from: USER3 });
      assert.equal((await testTopic.getVoteBalances({ from: USER3 }))[0].toString(), vote3.toString());
    });
  });

  describe('getFinalResult()', () => {
    it('returns the final result index and name', async () => {
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });

      const finalResultIndex = 1;
      await centralizedOracle.setResult(finalResultIndex, { from: ORACLE });

      let finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], finalResultIndex);
      assert.isFalse(finalResult[1]);

      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);

      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);
      await decentralizedOracle.finalizeResult();

      finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], finalResultIndex);
      assert.isTrue(finalResult[1]);
    });
  });

  describe('calculateTokensWon', () => {
    const centralizedOracleResult = 2;

    it('returns the BOT and QTUM for a single round', async () => {
      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      // First round of betting
      const bet1 = Utils.getBigNumberWithDecimals(13, NATIVE_DECIMALS);
      await centralizedOracle.bet(0, {
        from: USER1,
        value: bet1,
      });
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), bet1.toNumber());

      const bet2 = Utils.getBigNumberWithDecimals(22, NATIVE_DECIMALS);
      await centralizedOracle.bet(1, {
        from: USER2,
        value: bet2,
      });
      let totalBetBalance = bet1.add(bet2);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

      const bet3 = Utils.getBigNumberWithDecimals(30, NATIVE_DECIMALS);
      await centralizedOracle.bet(centralizedOracleResult, {
        from: USER3,
        value: bet3,
      });
      totalBetBalance = bet1.add(bet2).add(bet3);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

      const bet4 = Utils.getBigNumberWithDecimals(12, NATIVE_DECIMALS);
      await centralizedOracle.bet(centralizedOracleResult, {
        from: USER4,
        value: bet4,
      });
      totalBetBalance = bet1.add(bet2).add(bet3).add(bet4);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

      assert.equal((await testTopic.totalQtumValue.call()).toString(), totalBetBalance.toString());

      // CentralizedOracle sets result 2
      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._resultSettingEndTime);

      await token.approve(testTopic.address, CORACLE_THRESHOLD, { from: ORACLE });
      assert.equal(
        (await token.allowance(ORACLE, testTopic.address)).toString(),
        CORACLE_THRESHOLD.toString(),
      );

      await centralizedOracle.setResult(centralizedOracleResult, { from: ORACLE });
      assert.isTrue((await testTopic.oracles.call(0))[1]);
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_VOTING);
      const finalResult = await testTopic.getFinalResult();
      assert.equal(finalResult[0], centralizedOracleResult);
      assert.isFalse(finalResult[1]);

      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);

      // DecentralizedOracle voting under consensusThreshold
      const vote1 = Utils.getBigNumberWithDecimals(45, BOT_DECIMALS);
      await token.approve(testTopic.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal((await testTopic.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

      const vote2 = Utils.getBigNumberWithDecimals(54, BOT_DECIMALS);
      await token.approve(testTopic.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(1, vote2, { from: USER2 });
      assert.equal((await testTopic.getVoteBalances({ from: USER2 }))[1].toString(), vote2.toString());

      const totalVoteBalance = CORACLE_THRESHOLD.add(vote1).add(vote2);
      assert.equal((await testTopic.totalBotValue.call()).toString(), totalVoteBalance.toString());
      assert.equal(
        (await token.balanceOf(testTopic.address)).toString(),
        (await testTopic.totalBotValue.call()).toString(),
      );

      // DecentralizedOracle finalize result
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      await decentralizedOracle.finalizeResult({ from: USER1 });
      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);
      assert.equal((await testTopic.getFinalResult())[0].toNumber(), centralizedOracleResult);

      // Calculate QTUM winnings
      const percentCut = await testTopic.QTUM_PERCENTAGE.call();
      let losingQtum = bet1.add(bet2);
      const winningQtum = bet3.add(bet4);
      const rewardQtum = losingQtum.mul(percentCut).div(100);
      losingQtum = losingQtum.sub(rewardQtum);
      const losingBot = vote1.add(vote2);
      const winningBot = CORACLE_THRESHOLD;

      // USER3:
      // 0 BOT won
      // 30 * 31 / 42 = 22 + 27 = 49 qtum won
      let botWon = 0;
      let qtumWon = Math.floor(bet3.mul(losingQtum).div(winningQtum).add(bet3));

      let winningsArr = await testTopic.calculateWinnings({ from: USER3 });
      assert.equal(winningsArr[0], 0);
      assert.equal(winningsArr[1].toString(), qtumWon.toString());

      // USER4:
      // 0 BOT won
      // 12 * 31 / 42 = 8 + 10 = 18 qtum won
      botWon = 0;
      qtumWon = Math.floor(bet4.mul(losingQtum).div(winningQtum).add(bet4));

      winningsArr = await testTopic.calculateWinnings({ from: USER4 });
      assert.equal(winningsArr[0], botWon.toString());
      assert.equal(winningsArr[1].toString(), qtumWon.toString());

      // ORACLE:
      // 100 * 99 / 100 = 99 + 100 = 199 BOT won
      // 0 QTUM won
      const vote = CORACLE_THRESHOLD;
      botWon = Math.floor(vote.mul(losingBot).div(winningBot).add(vote));
      qtumWon = vote.mul(rewardQtum).div(winningBot);

      winningsArr = await testTopic.calculateWinnings({ from: ORACLE });
      assert.equal(winningsArr[0].toString(), botWon.toString());
      assert.equal(winningsArr[1].toString(), qtumWon.toString());
    });

    it('returns the BOT and QTUM for multiple rounds', async () => {
      const consensusThresholdIncrement = await addressManager.consensusThresholdIncrement.call();
      const decentralizedOracle1Result = 0;
      const decentralizedOracle2Result = 2;

      await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

      // First round of betting
      bet1 = web3.toBigNumber(1234567890);
      await centralizedOracle.bet(0, {
        from: USER1,
        value: bet1,
      });
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), bet1);

      bet2 = web3.toBigNumber(2345678901);
      await centralizedOracle.bet(1, {
        from: USER2,
        value: bet2,
      });
      let totalBetBalance = bet1.add(bet2);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

      bet3 = web3.toBigNumber(3047682437);
      await centralizedOracle.bet(centralizedOracleResult, {
        from: USER3,
        value: bet3,
      });
      totalBetBalance = bet1.add(bet2).add(bet3);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

      bet4 = web3.toBigNumber(1218956043);
      await centralizedOracle.bet(centralizedOracleResult, {
        from: USER4,
        value: bet4,
      });
      totalBetBalance = bet1.add(bet2).add(bet3).add(bet4);
      assert.equal(web3.eth.getBalance(testTopic.address).toNumber(), totalBetBalance.toNumber());

      assert.equal((await testTopic.totalQtumValue.call()).toString(), totalBetBalance.toString());

      // CentralizedOracle votes with 100 BOT to set result 2.
      let threshold = CORACLE_THRESHOLD;

      await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);

      await token.approve(testTopic.address, threshold, { from: ORACLE });
      await centralizedOracle.setResult(centralizedOracleResult, { from: ORACLE });

      let totalBotValue = CORACLE_THRESHOLD;
      assert.equal((await testTopic.totalBotValue.call()).toString(), totalBotValue.toString());
      assert.equal((await testTopic.getFinalResult())[0], centralizedOracleResult);

      // DecentralizedOracle1 voting. Threshold hits and result becomes 0.
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(1))[0]);
      assert.equal((await testTopic.totalBotValue.call()).toString(), threshold.toString());
      assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), CORACLE_THRESHOLD.toString());

      const vote1a = web3.toBigNumber(6012345678);
      await token.approve(testTopic.address, vote1a, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1a.toString());
      await decentralizedOracle.voteResult(decentralizedOracle1Result, vote1a, { from: USER1 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER1 }))[decentralizedOracle1Result].toString(),
        vote1a.toString(),
      );

      const vote2a = web3.toBigNumber(5123456789);
      await token.approve(testTopic.address, vote2a, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2a.toString());
      await decentralizedOracle.voteResult(decentralizedOracle1Result, vote2a, { from: USER2 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER2 }))[decentralizedOracle1Result].toString(),
        vote2a.toString(),
      );

      totalBotValue = totalBotValue.add(vote1a).add(vote2a);
      assert.equal((await testTopic.totalBotValue.call()).toString(), totalBotValue.toString());
      assert.equal((await testTopic.getFinalResult())[0], decentralizedOracle1Result);

      // DecentralizedOracle2 voting. Threshold hits and result becomes 2.
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(2))[0]);
      threshold = vote1a.add(vote2a).add(consensusThresholdIncrement);
      assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), threshold.toString());

      const vote3a = web3.toBigNumber(3012345678);
      await token.approve(testTopic.address, vote3a, { from: USER3 });
      assert.equal((await token.allowance(USER3, testTopic.address)).toString(), vote3a.toString());
      await decentralizedOracle.voteResult(decentralizedOracle2Result, vote3a, { from: USER3 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER3 }))[decentralizedOracle2Result].toString(),
        vote3a.toString(),
      );

      const vote4a = web3.toBigNumber(4087654321);
      await token.approve(testTopic.address, vote4a, { from: USER4 });
      assert.equal((await token.allowance(USER4, testTopic.address)).toString(), vote4a.toString());
      await decentralizedOracle.voteResult(decentralizedOracle2Result, vote4a, { from: USER4 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER4 }))[decentralizedOracle2Result].toString(),
        vote4a.toString(),
      );

      const vote5a = web3.toBigNumber(5543215678);
      await token.approve(testTopic.address, vote5a, { from: USER5 });
      assert.equal((await token.allowance(USER5, testTopic.address)).toString(), vote5a.toString());
      await decentralizedOracle.voteResult(decentralizedOracle2Result, vote5a, { from: USER5 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER5 }))[decentralizedOracle2Result].toString(),
        vote5a.toString(),
      );

      totalBotValue = totalBotValue.add(vote3a).add(vote4a).add(vote5a);
      assert.equal((await testTopic.totalBotValue.call()).toString(), totalBotValue.toString());
      assert.equal((await testTopic.getFinalResult())[0], decentralizedOracle2Result);

      // DecentralizedOracle3 voting. Fails and result gets finalized to 2.
      decentralizedOracle = await DecentralizedOracle.at((await testTopic.oracles.call(3))[0]);
      threshold = vote3a.add(vote4a).add(vote5a).add(consensusThresholdIncrement);
      assert.equal((await decentralizedOracle.consensusThreshold.call()).toString(), threshold.toString());

      const vote1b = web3.toBigNumber(5377777777);
      const totalVote1 = vote1a.add(vote1b);
      await token.approve(testTopic.address, vote1b, { from: USER1 });
      assert.equal((await token.allowance(USER1, testTopic.address)).toString(), vote1b.toString());
      await decentralizedOracle.voteResult(decentralizedOracle1Result, vote1b, { from: USER1 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER1 }))[decentralizedOracle1Result].toString(),
        totalVote1.toString(),
      );

      const vote2b = web3.toBigNumber(4955555555);
      const totalVote2 = vote2a.add(vote2b);
      await token.approve(testTopic.address, vote2b, { from: USER2 });
      assert.equal((await token.allowance(USER2, testTopic.address)).toString(), vote2b.toString());
      await decentralizedOracle.voteResult(decentralizedOracle1Result, vote2b, { from: USER2 });
      assert.equal(
        (await testTopic.getVoteBalances({ from: USER2 }))[decentralizedOracle1Result].toString(),
        totalVote2.toString(),
      );

      // Finalize result 2
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      await decentralizedOracle.finalizeResult({ from: USER3 });
      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await testTopic.status.call()).toNumber(), STATUS_COLLECTION);

      // Withdraw winnings: USER3, USER4, USER5, ORACLE
      const percentCut = await testTopic.QTUM_PERCENTAGE.call();
      let losersQtum = bet1.add(bet2);
      const winnersQtum = bet3.add(bet4);
      const rewardQtum = Math.floor(losersQtum.mul(percentCut).div(100));
      losersQtum = losersQtum.sub(rewardQtum);
      const losersBot = vote1a.add(vote2a).add(vote1b).add(vote2b);
      const winnersBot = CORACLE_THRESHOLD.add(vote3a).add(vote4a).add(vote5a);

      // USER3 winner
      let votes = vote3a;
      let expectedBot = Math.floor(votes.mul(losersBot).div(winnersBot).add(votes));
      let extraQtum = Math.floor(votes.mul(rewardQtum).div(winnersBot));

      let bets = bet3;
      let expectedQtum = Math.floor(bets.mul(losersQtum).div(winnersQtum).add(bets));
      expectedQtum = web3.toBigNumber(expectedQtum).add(extraQtum);

      let winningsArr = await testTopic.calculateWinnings({ from: USER3 });
      assert.equal(winningsArr[0], expectedBot.toString());
      assert.equal(winningsArr[1].toString(), expectedQtum.toString());

      // USER4 winner
      votes = vote4a;
      expectedBot = Math.floor(votes.mul(losersBot).div(winnersBot).add(votes));
      extraQtum = Math.floor(votes.mul(rewardQtum).div(winnersBot));

      bets = bet4;
      expectedQtum = Math.floor(bets.mul(losersQtum).div(winnersQtum).add(bets));
      expectedQtum = web3.toBigNumber(expectedQtum).add(extraQtum);

      winningsArr = await testTopic.calculateWinnings({ from: USER4 });
      assert.equal(winningsArr[0], expectedBot.toString());
      assert.equal(winningsArr[1].toString(), expectedQtum.toString());

      // USER5 winner
      votes = vote5a;
      expectedBot = Math.floor(votes.mul(losersBot).div(winnersBot).add(votes));
      extraQtum = Math.floor(votes.mul(rewardQtum).div(winnersBot));

      bets = web3.toBigNumber(0);
      expectedQtum = Math.floor(bets.mul(losersQtum).div(winnersQtum).add(bets));
      expectedQtum = web3.toBigNumber(expectedQtum).add(extraQtum);

      winningsArr = await testTopic.calculateWinnings({ from: USER5 });
      assert.equal(winningsArr[0], expectedBot.toString());
      assert.equal(winningsArr[1].toString(), expectedQtum.toString());

      // CentralizedOracle winner
      votes = CORACLE_THRESHOLD;
      expectedBot = Math.floor(votes.mul(losersBot).div(winnersBot).add(votes));
      extraQtum = Math.floor(votes.mul(rewardQtum).div(winnersBot));

      bets = web3.toBigNumber(0);
      expectedQtum = Math.floor(bets.mul(losersQtum).div(winnersQtum).add(bets));
      expectedQtum = web3.toBigNumber(expectedQtum).add(extraQtum);

      winningsArr = await testTopic.calculateWinnings({ from: ORACLE });
      assert.equal(winningsArr[0], expectedBot.toString());
      assert.equal(winningsArr[1].toString(), expectedQtum.toString());

      // USER1 loser
      winningsArr = await testTopic.calculateWinnings({ from: USER1 });
      assert.equal(winningsArr[0], 0);
      assert.equal(winningsArr[1].toString(), 0);

      // USER2 loser
      winningsArr = await testTopic.calculateWinnings({ from: USER2 });
      assert.equal(winningsArr[0], 0);
      assert.equal(winningsArr[1].toString(), 0);
    });

    it('throws if status is not Status:Collection', async () => {
      assert.notEqual(await testTopic.status.call(), STATUS_COLLECTION);
      try {
        await testTopic.calculateWinnings({ from: USER3 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });
});
