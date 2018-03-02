const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');

const BodhiToken = artifacts.require('./tokens/BodhiToken.sol');
const AddressManager = artifacts.require('./storage/AddressManager.sol');
const EventFactory = artifacts.require('./events/EventFactory.sol');
const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const TopicEvent = artifacts.require('./TopicEvent.sol');
const CentralizedOracle = artifacts.require('./oracles/CentralizedOracle.sol');
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

contract('CentralizedOracle', (accounts) => {
  const timeMachine = new TimeMachine(web3);

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

  const NUM_OF_RESULTS = 4; // topicEventParams._resultNames + invalid default result
  const VERSION = 0;

  let addressManager;
  let eventFactory;
  let token;
  let topicEvent;
  let centralizedOracle;
  let startingOracleThreshold;

  before(async () => {
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
    assert.equal(await addressManager.getOracleFactoryAddress(0), oracleFactory.address);
  });

  beforeEach(async () => {
    await timeMachine.mine();
    await timeMachine.snapshot();

    topicEventParams = getTopicParams(ORACLE);
    const tx = await eventFactory.createTopic(...Object.values(topicEventParams), { from: OWNER });
    topicEvent = TopicEvent.at(tx.logs[0].args._topicAddress);

    centralizedOracle = CentralizedOracle.at((await topicEvent.oracles.call(0))[0]);
    startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
  });

  afterEach(async () => {
    await timeMachine.revert();
  });

  describe('constructor', () => {
    it('initializes all the values', async () => {
      assert.equal(await centralizedOracle.version.call(), 0);
      assert.equal(await centralizedOracle.owner.call(), topicEvent.address);
      assert.equal(await centralizedOracle.eventAddress.call(), topicEvent.address);
      assert.equal((await centralizedOracle.numOfResults.call()).toNumber(), NUM_OF_RESULTS);
      assert.equal(await centralizedOracle.oracle.call(), ORACLE);
      assert.equal(await centralizedOracle.bettingStartTime.call(), topicEventParams._bettingStartTime);
      assert.equal(await centralizedOracle.bettingEndTime.call(), topicEventParams._bettingEndTime);
      assert.equal(
        await centralizedOracle.resultSettingStartTime.call(),
        topicEventParams._resultSettingStartTime,
      );
      assert.equal(
        await centralizedOracle.resultSettingEndTime.call(),
        topicEventParams._resultSettingEndTime,
      );
      assert.equal(
        startingOracleThreshold.toString(),
        (await addressManager.startingOracleThreshold.call()).toString(),
      );
    });

    it('throws if owner is invalid', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, 0, topicEvent.address, NUM_OF_RESULTS, ORACLE,
          topicEventParams._bettingStartTime, topicEventParams._bettingEndTime,
          topicEventParams._resultSettingStartTime, topicEventParams._resultSettingEndTime,
          startingOracleThreshold,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if oracle is invalid', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, OWNER, topicEvent.address, NUM_OF_RESULTS, 0,
          topicEventParams._bettingStartTime, topicEventParams._bettingEndTime,
          topicEventParams._resultSettingStartTime, topicEventParams._resultSettingEndTime,
          startingOracleThreshold,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if eventAddress is invalid', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, OWNER, 0, NUM_OF_RESULTS, ORACLE,
          topicEventParams._bettingStartTime, topicEventParams._bettingEndTime,
          topicEventParams._resultSettingStartTime, topicEventParams._resultSettingEndTime,
          startingOracleThreshold,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if numOfResults is 0', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, OWNER, topicEvent.address, 0, ORACLE,
          topicEventParams._bettingStartTime, topicEventParams._bettingEndTime,
          topicEventParams._resultSettingStartTime, topicEventParams._resultSettingEndTime,
          startingOracleThreshold,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if bettingEndTime is <= bettingStartTime', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, OWNER, topicEvent.address, NUM_OF_RESULTS, ORACLE,
          topicEventParams._bettingStartTime, topicEventParams._bettingStartTime,
          topicEventParams._resultSettingStartTime, topicEventParams._resultSettingEndTime,
          startingOracleThreshold,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if resultSettingStartTime is < bettingEndTime', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, OWNER, topicEvent.address, NUM_OF_RESULTS, ORACLE,
          topicEventParams._bettingStartTime, topicEventParams._bettingEndTime,
          topicEventParams._bettingEndTime - 1, topicEventParams._resultSettingEndTime,
          startingOracleThreshold,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if resultSettingEndTime is <= resultSettingStartTime', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, OWNER, topicEvent.address, NUM_OF_RESULTS, ORACLE,
          topicEventParams._bettingStartTime, topicEventParams._bettingEndTime,
          topicEventParams._resultSettingStartTime, topicEventParams._resultSettingStartTime,
          startingOracleThreshold,
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if consensusThreshold == 0', async () => {
      try {
        topicEventParams = getTopicParams(ORACLE);
        await CentralizedOracle.new(
          VERSION, OWNER, topicEvent.address, NUM_OF_RESULTS, ORACLE,
          topicEventParams._bettingStartTime, topicEventParams._bettingEndTime,
          topicEventParams._resultSettingStartTime, topicEventParams._resultSettingEndTime, 0,
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
          to: centralizedOracle.address,
          from: USER1,
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('bet()', () => {
    it('allows betting', async () => {
      await timeMachine.increaseTime(topicEventParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._bettingEndTime);

      const betAmount = Utils.getBigNumberWithDecimals(1, NATIVE_DECIMALS);
      const betResultIndex = 1;
      await centralizedOracle.bet(betResultIndex, {
        from: USER1,
        value: betAmount,
      });

      assert.equal((await centralizedOracle.getTotalBets())[betResultIndex].toString(), betAmount.toString());
      assert.equal(
        (await centralizedOracle.getBetBalances({ from: USER1 }))[betResultIndex].toString(),
        betAmount.toString(),
      );
    });

    it('throws if resultIndex is invalid', async () => {
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._bettingEndTime);

      try {
        await centralizedOracle.bet(3, {
          from: USER1,
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if the oracle is finished', async () => {
      await timeMachine.increaseTime(topicEventParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);

      await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
      assert.equal(
        (await token.allowance(ORACLE, topicEvent.address)).toString(),
        startingOracleThreshold.toString(),
      );

      await centralizedOracle.setResult(0, { from: ORACLE });
      assert.isTrue(await centralizedOracle.finished.call());

      try {
        await centralizedOracle.bet(1, {
          from: USER1,
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if current time is < bettingStartTime', async () => {
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._bettingStartTime);

      try {
        await centralizedOracle.bet(0, {
          from: USER1,
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if current time is >= bettingEndTime', async () => {
      await timeMachine.increaseTime(topicEventParams._bettingEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._bettingEndTime);

      try {
        await centralizedOracle.bet(0, {
          from: USER1,
          value: 1,
        });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if the bet is 0', async () => {
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._bettingEndTime);

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

  describe('setResult()', () => {
    beforeEach(async () => {
      assert.isFalse(await centralizedOracle.finished.call());
      assert.equal(await centralizedOracle.oracle.call(), ORACLE);

      await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
      assert.equal(
        (await token.allowance(ORACLE, topicEvent.address)).toString(),
        startingOracleThreshold.toString(),
      );
    });

    describe('in valid time', () => {
      beforeEach(async () => {
        await timeMachine.increaseTime(topicEventParams._resultSettingStartTime - Utils.getCurrentBlockTime());
        assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingStartTime);
        assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);
      });

      it('sets the result index', async () => {
        const resultIndex = 2;
        await centralizedOracle.setResult(resultIndex, { from: ORACLE });
        assert.isTrue(await centralizedOracle.finished.call());
        assert.equal(await centralizedOracle.resultIndex.call(), resultIndex);
        assert.equal(
          (await centralizedOracle.getTotalVotes())[resultIndex].toString(),
          startingOracleThreshold.toString(),
        );
        assert.equal(
          (await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex].toString(),
          startingOracleThreshold.toString(),
        );
      });

      it('allows anyone to set the result if current time >= resultSettingEndTime', async () => {
        await timeMachine.increaseTime(topicEventParams._resultSettingEndTime - Utils.getCurrentBlockTime());
        assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);

        await token.approve(topicEvent.address, startingOracleThreshold, { from: USER1 });
        assert.equal(
          (await token.allowance(USER1, topicEvent.address)).toString(),
          startingOracleThreshold.toString(),
        );

        const resultIndex = 2;
        await centralizedOracle.setResult(resultIndex, { from: USER1 });
        assert.isTrue(await centralizedOracle.finished.call());
        assert.equal(await centralizedOracle.resultIndex.call(), resultIndex);
        assert.equal(
          (await centralizedOracle.getTotalVotes())[resultIndex].toString(),
          startingOracleThreshold.toString(),
        );
        assert.equal(
          (await centralizedOracle.getVoteBalances({ from: USER1 }))[resultIndex].toString(),
          startingOracleThreshold.toString(),
        );
      });

      it('throws if resultIndex is invalid', async () => {
        try {
          await centralizedOracle.setResult(4, { from: ORACLE });
          assert.fail();
        } catch (e) {
          SolAssert.assertRevert(e);
        }
      });

      it('throws if it is already finished', async () => {
        await centralizedOracle.setResult(0, { from: ORACLE });
        assert.isTrue(await centralizedOracle.finished.call());

        await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
        assert.equal(
          (await token.allowance(ORACLE, topicEvent.address)).toString(),
          startingOracleThreshold.toString(),
        );

        try {
          await centralizedOracle.setResult(1, { from: ORACLE });
          assert.fail();
        } catch (e) {
          SolAssert.assertRevert(e);
        }
      });

      it('throws if the sender is not the oracle and < resultSettingEndTime', async () => {
        await token.approve(topicEvent.address, startingOracleThreshold, { from: USER1 });
        assert.equal(
          (await token.allowance(USER1, topicEvent.address)).toString(),
          startingOracleThreshold.toString(),
        );

        try {
          await centralizedOracle.setResult(0, { from: USER1 });
          assert.fail();
        } catch (e) {
          SolAssert.assertRevert(e);
        }
      });
    });

    describe('in invalid time', () => {
      it('throws if time is < bettingEndTime', async () => {
        assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._resultSettingStartTime);

        try {
          await centralizedOracle.setResult(0, { from: ORACLE });
          assert.fail();
        } catch (e) {
          SolAssert.assertRevert(e);
        }
      });
    });
  });

  describe('getBetBalances()', () => {
    it('returns the bet balances', async () => {
      await timeMachine.increaseTime(topicEventParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._bettingEndTime);

      const betAmount = Utils.getBigNumberWithDecimals(1, NATIVE_DECIMALS);
      await centralizedOracle.bet(0, {
        from: USER1,
        value: betAmount,
      });
      assert.equal(
        (await centralizedOracle.getBetBalances({ from: USER1 }))[0].toString(),
        betAmount.toString(),
      );

      await centralizedOracle.bet(1, {
        from: USER2,
        value: betAmount,
      });
      assert.equal(
        (await centralizedOracle.getBetBalances({ from: USER2 }))[1].toString(),
        betAmount.toString(),
      );

      await centralizedOracle.bet(2, {
        from: USER3,
        value: betAmount,
      });
      assert.equal(
        (await centralizedOracle.getBetBalances({ from: USER3 }))[2].toString(),
        betAmount.toString(),
      );
    });
  });

  describe('getTotalBets()', () => {
    it('returns the total bets', async () => {
      await timeMachine.increaseTime(topicEventParams._bettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._bettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._bettingEndTime);

      const betAmount = Utils.getBigNumberWithDecimals(1, NATIVE_DECIMALS);
      await centralizedOracle.bet(0, {
        from: USER1,
        value: betAmount,
      });
      assert.equal((await centralizedOracle.getTotalBets())[0].toString(), betAmount.toString());

      await centralizedOracle.bet(0, {
        from: USER2,
        value: betAmount,
      });
      assert.equal(
        (await centralizedOracle.getTotalBets({ from: USER2 }))[0].toString(),
        betAmount.mul(2).toString(),
      );

      await centralizedOracle.bet(0, {
        from: USER3,
        value: betAmount,
      });
      assert.equal(
        (await centralizedOracle.getTotalBets({ from: USER3 }))[0].toString(),
        betAmount.mul(3).toString(),
      );
    });
  });

  describe('getVoteBalances()', () => {
    it('returns the vote balances', async () => {
      await timeMachine.increaseTime(topicEventParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);

      startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
      await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
      assert.equal(
        (await token.allowance(ORACLE, topicEvent.address)).toString(),
        startingOracleThreshold.toString(),
      );

      const resultIndex = 2;
      await centralizedOracle.setResult(resultIndex, { from: ORACLE });
      assert.equal(
        (await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex].toString(),
        startingOracleThreshold.toString(),
      );
    });
  });

  describe('getTotalVotes()', () => {
    it('returns the total votes', async () => {
      await timeMachine.increaseTime(topicEventParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);

      startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
      await token.approve(topicEvent.address, startingOracleThreshold, { from: ORACLE });
      assert.equal(
        (await token.allowance(ORACLE, topicEvent.address)).toString(),
        startingOracleThreshold.toString(),
      );

      const resultIndex = 2;
      await centralizedOracle.setResult(resultIndex, { from: ORACLE });
      assert.equal(
        (await centralizedOracle.getTotalVotes())[resultIndex].toString(),
        startingOracleThreshold.toString(),
      );
    });
  });
});
