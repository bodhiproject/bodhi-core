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
const ContractHelper = require('../helpers/contract_helper');

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
  let token;
  let eventFactory;
  let oracleFactory;
  let topicEvent;
  let centralizedOracle;
  let startingOracleThreshold;

  before(async () => {
    const baseContracts = await ContractHelper.initBaseContracts(ADMIN, accounts);
    addressManager = baseContracts.addressManager;
    token = baseContracts.bodhiToken;
    eventFactory = baseContracts.eventFactory;
    oracleFactory = baseContracts.oracleFactory;
  });

  beforeEach(async () => {
    await timeMachine.mine();
    await timeMachine.snapshot();

    const escrowAmount = await addressManager.eventEscrowAmount.call();
    await ContractHelper.approve(token, OWNER, addressManager.address, escrowAmount);

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
      SolAssert.assertBNEqual(await addressManager.startingOracleThreshold.call(), startingOracleThreshold);
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

      SolAssert.assertBNEqual((await centralizedOracle.getTotalBets())[betResultIndex], betAmount);
      SolAssert.assertBNEqual((await centralizedOracle.getBetBalances({ from: USER1 }))[betResultIndex], betAmount);
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

      await ContractHelper.approve(token, ORACLE, topicEvent.address, startingOracleThreshold);
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

      await ContractHelper.approve(token, ORACLE, topicEvent.address, startingOracleThreshold);
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
        SolAssert.assertBNEqual((await centralizedOracle.getTotalVotes())[resultIndex], startingOracleThreshold);
        SolAssert.assertBNEqual((await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex],
          startingOracleThreshold);
      });

      it('allows anyone to set the result if current time >= resultSettingEndTime', async () => {
        await timeMachine.increaseTime(topicEventParams._resultSettingEndTime - Utils.getCurrentBlockTime());
        assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);

        await ContractHelper.approve(token, USER1, topicEvent.address, startingOracleThreshold);

        const resultIndex = 2;
        await centralizedOracle.setResult(resultIndex, { from: USER1 });
        assert.isTrue(await centralizedOracle.finished.call());
        assert.equal(await centralizedOracle.resultIndex.call(), resultIndex);
        SolAssert.assertBNEqual((await centralizedOracle.getTotalVotes())[resultIndex], startingOracleThreshold);
        SolAssert.assertBNEqual((await centralizedOracle.getVoteBalances({ from: USER1 }))[resultIndex],
          startingOracleThreshold);
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

        await ContractHelper.approve(token, ORACLE, topicEvent.address, startingOracleThreshold);

        try {
          await centralizedOracle.setResult(1, { from: ORACLE });
          assert.fail();
        } catch (e) {
          SolAssert.assertRevert(e);
        }
      });

      it('throws if the sender is not the oracle and < resultSettingEndTime', async () => {
        await ContractHelper.approve(token, USER1, topicEvent.address, startingOracleThreshold);

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
      SolAssert.assertBNEqual((await centralizedOracle.getBetBalances({ from: USER1 }))[0], betAmount);

      await centralizedOracle.bet(1, {
        from: USER2,
        value: betAmount,
      });
      SolAssert.assertBNEqual((await centralizedOracle.getBetBalances({ from: USER2 }))[1], betAmount);

      await centralizedOracle.bet(2, {
        from: USER3,
        value: betAmount,
      });
      SolAssert.assertBNEqual((await centralizedOracle.getBetBalances({ from: USER3 }))[2], betAmount);
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
      SolAssert.assertBNEqual((await centralizedOracle.getTotalBets())[0], betAmount);

      await centralizedOracle.bet(0, {
        from: USER2,
        value: betAmount,
      });
      SolAssert.assertBNEqual((await centralizedOracle.getTotalBets({ from: USER2 }))[0], betAmount.mul(2));

      await centralizedOracle.bet(0, {
        from: USER3,
        value: betAmount,
      });
      SolAssert.assertBNEqual((await centralizedOracle.getTotalBets({ from: USER3 }))[0], betAmount.mul(3));
    });
  });

  describe('getVoteBalances()', () => {
    it('returns the vote balances', async () => {
      await timeMachine.increaseTime(topicEventParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);

      startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
      await ContractHelper.approve(token, ORACLE, topicEvent.address, startingOracleThreshold);

      const resultIndex = 2;
      await centralizedOracle.setResult(resultIndex, { from: ORACLE });
      SolAssert.assertBNEqual((await centralizedOracle.getVoteBalances({ from: ORACLE }))[resultIndex],
        startingOracleThreshold);
    });
  });

  describe('getTotalVotes()', () => {
    it('returns the total votes', async () => {
      await timeMachine.increaseTime(topicEventParams._resultSettingStartTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), topicEventParams._resultSettingStartTime);
      assert.isBelow(Utils.getCurrentBlockTime(), topicEventParams._resultSettingEndTime);

      startingOracleThreshold = await centralizedOracle.consensusThreshold.call();
      await ContractHelper.approve(token, ORACLE, topicEvent.address, startingOracleThreshold);

      const resultIndex = 2;
      await centralizedOracle.setResult(resultIndex, { from: ORACLE });
      SolAssert.assertBNEqual((await centralizedOracle.getTotalVotes())[resultIndex], startingOracleThreshold);
    });
  });
});
