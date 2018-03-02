const AddressManager = artifacts.require('./storage/AddressManager.sol');
const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const CentralizedOracle = artifacts.require('./oracles/CentralizedOracle.sol');
const DecentralizedOracle = artifacts.require('./oracles/DecentralizedOracle.sol');
const TimeMachine = require('../helpers/time_machine');
const Utils = require('../helpers/utils');
const assert = require('chai').assert;
const SolAssert = require('../helpers/sol_assert');

const web3 = global.web3;

function getCOracleParams(oracle, consensusThreshold) {
  const currTime = Utils.getCurrentBlockTime();
  return {
    _eventAddress: '0x1111111111111111111111111111111111111111',
    _numOfResults: 4,
    _oracle: oracle,
    _bettingStartTime: currTime + 1000,
    _bettingEndTime: currTime + 3000,
    _resultSettingStartTime: currTime + 4000,
    _resultSettingEndTime: currTime + 6000,
    _consensusThreshold: consensusThreshold,
  };
}

function getDOracleParams(arbitrationEndTime, consensusThreshold) {
  return {
    _eventAddress: '0x1111111111111111111111111111111111111111',
    _numOfResults: 4,
    _lastResultIndex: 2,
    _arbitrationEndTime: arbitrationEndTime,
    _consensusThreshold: consensusThreshold,
  };
}

contract('OracleFactory', (accounts) => {
  const BOT_DECIMALS = 8;

  const ADMIN = accounts[0];
  const ORACLE = accounts[1];
  const USER1 = accounts[2];

  const CONSENSUS_THRESHOLD = Utils.getBigNumberWithDecimals(100, BOT_DECIMALS);

  const timeMachine = new TimeMachine(web3);
  let addressManager;
  let oracleFactory;
  let cOracleParams;
  let dOracleParams;

  beforeEach(async () => {
    await timeMachine.mine();
    await timeMachine.snapshot();

    addressManager = await AddressManager.deployed({ from: ADMIN });
    oracleFactory = await OracleFactory.deployed(addressManager.address, { from: ADMIN });

    await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: ADMIN });
    assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), oracleFactory.address);
  });

  afterEach(async () => {
    await timeMachine.revert();
  });

  describe('constructor', () => {
    it('sets the values', async () => {
      assert.equal(await oracleFactory.version.call(), 0);
    });

    it('stores the OracleFactory address in AddressManager', async () => {
      const index = await addressManager.getLastOracleFactoryIndex();
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(index), oracleFactory.address);
    });

    it('saves the correct version number', async () => {
      oracleFactory = await OracleFactory.new(addressManager.address, { from: ADMIN });
      await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: ADMIN });
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(1), oracleFactory.address);
      assert.equal(await oracleFactory.version.call(), 1);
    });

    it('throws if the AddressManager address is invalid', async () => {
      try {
        await OracleFactory.new(0, { from: ADMIN });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('createCentralizedOracle()', () => {
    it('initializes all the values', async () => {
      cOracleParams = getCOracleParams(ORACLE, CONSENSUS_THRESHOLD);
      const tx = await oracleFactory.createCentralizedOracle(...Object.values(cOracleParams), { from: USER1 });
      const centralizedOracle = CentralizedOracle.at(tx.logs[0].args._contractAddress);

      assert.equal(await centralizedOracle.version.call(), 0);
      assert.equal(await centralizedOracle.owner.call(), USER1);
      assert.equal(await centralizedOracle.eventAddress.call(), cOracleParams._eventAddress);
      assert.equal((await centralizedOracle.numOfResults.call()).toNumber(), cOracleParams._numOfResults);
      assert.equal(await centralizedOracle.oracle.call(), ORACLE);
      assert.equal(await centralizedOracle.bettingStartTime.call(), cOracleParams._bettingStartTime);
      assert.equal(await centralizedOracle.bettingEndTime.call(), cOracleParams._bettingEndTime);
      assert.equal(await centralizedOracle.resultSettingStartTime.call(), cOracleParams._resultSettingStartTime);
      assert.equal(await centralizedOracle.resultSettingEndTime.call(), cOracleParams._resultSettingEndTime);
      assert.equal(
        (await centralizedOracle.consensusThreshold.call()).toString(),
        cOracleParams._consensusThreshold.toString(),
      );
    });

    it('throws if the CentralizedOracle has already been created', async () => {
      cOracleParams = getCOracleParams(ORACLE, CONSENSUS_THRESHOLD);
      await oracleFactory.createCentralizedOracle(...Object.values(cOracleParams), { from: USER1 });

      try {
        await oracleFactory.createCentralizedOracle(...Object.values(cOracleParams), { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('createDecentralizedOracle()', () => {
    it('initializes all the values', async () => {
      const arbitrationEndTime = Utils.getCurrentBlockTime()
        + (await addressManager.arbitrationLength.call()).toNumber();
      dOracleParams = getDOracleParams(arbitrationEndTime, CONSENSUS_THRESHOLD);
      const tx = await oracleFactory.createDecentralizedOracle(...Object.values(dOracleParams), { from: USER1 });
      const decentralizedOracle = DecentralizedOracle.at(tx.logs[0].args._contractAddress);

      assert.equal(await decentralizedOracle.eventAddress.call(), dOracleParams._eventAddress);
      assert.equal((await decentralizedOracle.numOfResults.call()).toNumber(), dOracleParams._numOfResults);
      assert.equal(await decentralizedOracle.lastResultIndex.call(), dOracleParams._lastResultIndex);
      assert.equal((await decentralizedOracle.arbitrationEndTime.call()).toNumber(), dOracleParams._arbitrationEndTime);
    });

    it('throws if the DecentralizedOracle has already been created', async () => {
      const arbitrationEndTime = Utils.getCurrentBlockTime()
        + (await addressManager.arbitrationLength.call()).toNumber();
      dOracleParams = getDOracleParams(arbitrationEndTime, CONSENSUS_THRESHOLD);
      await oracleFactory.createDecentralizedOracle(...Object.values(dOracleParams), { from: USER1 });

      try {
        await oracleFactory.createDecentralizedOracle(...Object.values(dOracleParams), { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });
});
