const web3 = global.web3;
const assert = require('chai').assert;

const BodhiToken = artifacts.require('./tokens/BodhiToken.sol');
const AddressManager = artifacts.require('./storage/AddressManager.sol');
const EventFactory = artifacts.require('./events/EventFactory.sol');
const TopicEvent = artifacts.require('./events/TopicEvent.sol');
const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const CentralizedOracle = artifacts.require('./oracles/CentralizedOracle.sol');
const DecentralizedOracle = artifacts.require('./oracles/DecentralizedOracle.sol');
const TimeMachine = require('../helpers/time_machine');
const Utils = require('../helpers/utils');
const SolAssert = require('../helpers/sol_assert');

function getTopicParams(oracle) {
  const currTime = Utils.getCurrentBlockTime();
  return {
    _oracle: oracle,
    _name: ['Who will be the next president i', 'n the 2020 election?'],
    _resultNames: ['Trump', 'The Rock', 'Hilary'],
    _bettingStartTime: currTime + 1000,
    _bettingEndTime: currTime + 3000,
    _resultSettingStartTime: currTime + 4000,
    _resultSettingEndTime: currTime + 6000,
  };
}

contract('DecentralizedOracle', (accounts) => {
  const timeMachine = new TimeMachine(web3);

  const BOT_DECIMALS = 8;
  const ADMIN = accounts[0];
  const ORACLE = accounts[1];
  const USER1 = accounts[2];
  const USER2 = accounts[3];
  const USER3 = accounts[4];
  const USER4 = accounts[5];
  const USER5 = accounts[6];
  const USER6 = accounts[7];
  const CENTRALIZED_ORACLE_RESULT = 1;
  const NUM_OF_RESULTS = 4; // topicParams._resultNames + invalid default result
  const VERSION = 0;

  let token;
  let addressManager;
  let eventFactory;
  let topicParams;
  let topicEvent;
  let centralizedOracle;
  let decentralizedOracle;
  let arbitrationLength;

  before(async () => {
    // Fund accounts
    const botBalance = Utils.getBigNumberWithDecimals(10000, BOT_DECIMALS);

    token = await BodhiToken.deployed({ from: ADMIN });
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
    await token.mintByOwner(USER6, botBalance, { from: ADMIN });
    assert.equal((await token.balanceOf(USER6)).toString(), botBalance.toString());

    // Init AddressManager
    addressManager = await AddressManager.deployed({ from: ADMIN });
    await addressManager.setBodhiTokenAddress(token.address, { from: ADMIN });
    assert.equal(await addressManager.bodhiTokenAddress.call(), token.address);

    arbitrationLength = (await addressManager.arbitrationLength.call()).toNumber();

    // Init factories
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

    // Init TopicEvent
    topicParams = getTopicParams(ORACLE);
    const tx = await eventFactory.createTopic(...Object.values(topicParams), { from: ORACLE });
    topicEvent = TopicEvent.at(tx.logs[0].args._topicAddress);
    centralizedOracle = CentralizedOracle.at((await topicEvent.oracles.call(0))[0]);

    // Betting
    await timeMachine.increaseTime(topicParams._bettingStartTime - Utils.getCurrentBlockTime());
    assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._bettingStartTime);
    assert.isBelow(Utils.getCurrentBlockTime(), topicParams._bettingEndTime);

    const bet1 = Utils.getBigNumberWithDecimals(20, BOT_DECIMALS);
    await centralizedOracle.bet(CENTRALIZED_ORACLE_RESULT, {
      from: USER1,
      value: bet1,
    });
    assert.equal(
      (await topicEvent.getBetBalances({ from: USER1 }))[CENTRALIZED_ORACLE_RESULT].toString(),
      bet1.toString(),
    );

    const bet2 = Utils.getBigNumberWithDecimals(30, BOT_DECIMALS);
    await centralizedOracle.bet(CENTRALIZED_ORACLE_RESULT, {
      from: USER2,
      value: bet2,
    });
    assert.equal(
      (await topicEvent.getBetBalances({ from: USER2 }))[CENTRALIZED_ORACLE_RESULT].toString(),
      bet2.toString(),
    );

    const bet3 = Utils.getBigNumberWithDecimals(11, BOT_DECIMALS);
    await centralizedOracle.bet(0, {
      from: USER3,
      value: bet3,
    });
    assert.equal((await topicEvent.getBetBalances({ from: USER3 }))[0].toString(), bet3.toString());

    // CentralizedOracle set result
    await timeMachine.increaseTime(topicParams._resultSettingStartTime - Utils.getCurrentBlockTime());
    assert.isAtLeast(Utils.getCurrentBlockTime(), topicParams._resultSettingStartTime);
    assert.isBelow(Utils.getCurrentBlockTime(), topicParams._resultSettingEndTime);

    assert.isFalse(await centralizedOracle.finished.call());
    assert.equal(await centralizedOracle.oracle.call(), ORACLE);

    const consensusThreshold = await centralizedOracle.consensusThreshold.call();
    await token.approve(topicEvent.address, consensusThreshold, { from: ORACLE });
    assert.equal(
      (await token.allowance(ORACLE, topicEvent.address)).toString(),
      consensusThreshold.toString(),
    );
    await centralizedOracle.setResult(CENTRALIZED_ORACLE_RESULT, { from: ORACLE });

    // DecentralizedOracle created
    decentralizedOracle = await DecentralizedOracle.at((await topicEvent.oracles.call(1))[0]);
  });

  afterEach(async () => {
    await timeMachine.revert();
  });

  describe('constructor', () => {
    const consensusThreshold = Utils.getBigNumberWithDecimals(100, BOT_DECIMALS);
    let arbitrationEndTime;

    beforeEach(() => {
      arbitrationEndTime = Utils.getCurrentBlockTime() + arbitrationLength;
    });

    it('inits the DecentralizedOracle with the correct values', async () => {
      assert.equal(await decentralizedOracle.version.call(), 0);
      assert.equal(await decentralizedOracle.eventAddress.call(), topicEvent.address);
      assert.equal((await decentralizedOracle.numOfResults.call()).toNumber(), NUM_OF_RESULTS);
      assert.equal(await decentralizedOracle.lastResultIndex.call(), CENTRALIZED_ORACLE_RESULT);
      assert.equal((await decentralizedOracle.arbitrationEndTime.call()).toNumber(), arbitrationEndTime);

      const threshold = await addressManager.startingOracleThreshold.call();
      assert.equal((await decentralizedOracle.consensusThreshold.call()).toNumber(), threshold.toNumber());
    });

    it('throws if eventAddress is invalid', async () => {
      try {
        await DecentralizedOracle.new(
          VERSION, ADMIN, 0, NUM_OF_RESULTS, CENTRALIZED_ORACLE_RESULT,
          arbitrationEndTime, consensusThreshold, { from: ADMIN },
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if numOfResults is 0', async () => {
      try {
        await DecentralizedOracle.new(
          VERSION, ADMIN, topicEvent.address, 0, CENTRALIZED_ORACLE_RESULT,
          arbitrationEndTime, consensusThreshold, { from: ADMIN },
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if arbitrationEndTime is <= current time', async () => {
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      try {
        await DecentralizedOracle.new(
          VERSION, ADMIN, topicEvent.address, NUM_OF_RESULTS,
          CENTRALIZED_ORACLE_RESULT, arbitrationEndTime, consensusThreshold, { from: ADMIN },
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if consensusThreshold is 0', async () => {
      try {
        await DecentralizedOracle.new(
          VERSION, ADMIN, topicEvent.address, NUM_OF_RESULTS,
          CENTRALIZED_ORACLE_RESULT, arbitrationEndTime, 0, { from: ADMIN },
        );
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('voteResult()', () => {
    it('allows voting', async () => {
      assert.isBelow(Utils.getCurrentBlockTime(), (await decentralizedOracle.arbitrationEndTime.call()).toNumber());

      const vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal(
        (await decentralizedOracle.getVoteBalances({ from: USER1 }))[0].toString(),
        vote1.toString(),
      );

      const vote2 = Utils.getBigNumberWithDecimals(5, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, topicEvent.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(2, vote2, { from: USER2 });
      assert.equal(
        (await decentralizedOracle.getVoteBalances({ from: USER2 }))[2].toString(),
        vote2.toString(),
      );

      assert.equal((await decentralizedOracle.getTotalVotes())[0].toString(), vote1.toString());
      assert.equal((await decentralizedOracle.getTotalVotes())[2].toString(), vote2.toString());
    });

    it('sets the result if the vote passes the consensusThreshold', async () => {
      assert.isBelow(Utils.getCurrentBlockTime(), (await decentralizedOracle.arbitrationEndTime.call()).toNumber());

      assert.isFalse(await decentralizedOracle.finished.call());
      assert.equal(
        (await decentralizedOracle.resultIndex.call()).toNumber(),
        (await decentralizedOracle.INVALID_RESULT_INDEX.call()).toNumber(),
      );

      const consensusThreshold = await decentralizedOracle.consensusThreshold.call();
      await token.approve(topicEvent.address, consensusThreshold, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), consensusThreshold.toString());

      await decentralizedOracle.voteResult(2, consensusThreshold, { from: USER1 });
      assert.equal(
        (await decentralizedOracle.getVoteBalances({ from: USER1 }))[2].toString(),
        consensusThreshold.toString(),
      );
      assert.equal((await decentralizedOracle.getTotalVotes())[2].toString(), consensusThreshold.toString());

      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), 2);
    });

    it('throws if eventResultIndex is invalid', async () => {
      assert.isBelow(Utils.getCurrentBlockTime(), (await decentralizedOracle.arbitrationEndTime.call()).toNumber());

      const vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());

      try {
        await decentralizedOracle.voteResult(CENTRALIZED_ORACLE_RESULT, vote1, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if the Oracle is finished', async () => {
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      assert.isFalse(await decentralizedOracle.finished.call());
      await decentralizedOracle.finalizeResult();
      assert.isTrue(await decentralizedOracle.finished.call());
      assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), CENTRALIZED_ORACLE_RESULT);

      const vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
      try {
        await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if botAmount is 0', async () => {
      assert.isBelow(Utils.getCurrentBlockTime(), (await decentralizedOracle.arbitrationEndTime.call()).toNumber());

      try {
        await decentralizedOracle.voteResult(CENTRALIZED_ORACLE_RESULT, 0, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if the time is at the arbitrationEndTime', async () => {
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
      assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);

      const vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());

      try {
        await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });

    it('throws if the voting on the lastResultIndex', async () => {
      const lastResultIndex = (await decentralizedOracle.lastResultIndex.call()).toNumber();

      const vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());

      try {
        await decentralizedOracle.voteResult(lastResultIndex, vote1, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('finalizeResult()', () => {
    describe('in valid time range', () => {
      beforeEach(async () => {
        const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
        await timeMachine.increaseTime(arbitrationEndTime - Utils.getCurrentBlockTime());
        assert.isAtLeast(Utils.getCurrentBlockTime(), arbitrationEndTime);
      });

      it('finalizes the result', async () => {
        assert.isFalse(await decentralizedOracle.finished.call());
        assert.equal(
          (await decentralizedOracle.resultIndex.call()).toNumber(),
          (await decentralizedOracle.INVALID_RESULT_INDEX.call()).toNumber(),
        );

        await decentralizedOracle.finalizeResult();
        assert.isTrue(await decentralizedOracle.finished.call());
        assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), CENTRALIZED_ORACLE_RESULT);
      });

      it('throws if the Oracle is finished', async () => {
        await decentralizedOracle.finalizeResult();
        assert.isTrue(await decentralizedOracle.finished.call());
        assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), CENTRALIZED_ORACLE_RESULT);

        try {
          await decentralizedOracle.finalizeResult();
          assert.fail();
        } catch (e) {
          SolAssert.assertRevert(e);
        }
      });
    });

    describe('in invalid time range', () => {
      it('throws if the time is below the arbitrationEndTime', async () => {
        const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
        assert.isBelow(Utils.getCurrentBlockTime(), arbitrationEndTime);

        try {
          await decentralizedOracle.finalizeResult();
          assert.fail();
        } catch (e) {
          SolAssert.assertRevert(e);
        }
      });
    });
  });

  describe('getVoteBalances()', () => {
    it('returns the vote balances', async () => {
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      assert.isBelow(Utils.getCurrentBlockTime(), arbitrationEndTime);

      const vote1 = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
      assert.equal((await decentralizedOracle.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

      const vote2 = Utils.getBigNumberWithDecimals(17, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, topicEvent.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(2, vote2, { from: USER2 });
      assert.equal((await decentralizedOracle.getVoteBalances({ from: USER2 }))[2].toString(), vote2.toString());
    });
  });

  describe('getTotalVotes()', () => {
    it('returns the total votes', async () => {
      const arbitrationEndTime = (await decentralizedOracle.arbitrationEndTime.call()).toNumber();
      assert.isBelow(Utils.getCurrentBlockTime(), arbitrationEndTime);

      const vote1 = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote1, { from: USER1 });
      assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
      await decentralizedOracle.voteResult(0, vote1, { from: USER1 });

      const vote2 = Utils.getBigNumberWithDecimals(17, BOT_DECIMALS);
      await token.approve(topicEvent.address, vote2, { from: USER2 });
      assert.equal((await token.allowance(USER2, topicEvent.address)).toString(), vote2.toString());
      await decentralizedOracle.voteResult(0, vote2, { from: USER2 });

      const totalVotes = vote1.add(vote2);
      assert.equal((await decentralizedOracle.getTotalVotes())[0].toString(), totalVotes.toString());
    });
  });
});
