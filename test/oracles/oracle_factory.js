const AddressManager = artifacts.require("./storage/AddressManager.sol");
const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const CentralizedOracle = artifacts.require("./oracles/CentralizedOracle.sol");
const DecentralizedOracle = artifacts.require('./oracles/DecentralizedOracle.sol');
const BlockHeightManager = require('../helpers/block_height_manager');
const Utils = require('../helpers/utils');
const assert = require('chai').assert;
const SolAssert = require('../helpers/sol_assert');
const web3 = global.web3;

contract('OracleFactory', function(accounts) {
  const blockHeightManager = new BlockHeightManager(web3);

  const NATIVE_DECIMALS = 8;
  const BOT_DECIMALS = 8;

  const ADMIN = accounts[0];
  const ORACLE = accounts[1];
  const USER1 = accounts[2];

  const CONSENSUS_THRESHOLD = Utils.getBigNumberWithDecimals(100, BOT_DECIMALS);

  const CORACLE_PARAMS = {
    _oracle: ORACLE,
    _eventAddress: "0x1111111111111111111111111111111111111111",
    _eventName: ["Will Apple stock reach $300 by t", "he end of 2017?"],
    _eventResultNames: ["first", "second", "third"],
    _numOfResults: 3,
    _bettingEndBlock: 100,
    _resultSettingEndBlock: 110,
    _consensusThreshold: CONSENSUS_THRESHOLD
  };

  const DORACLE_PARAMS = {
    _eventAddress: "0x1111111111111111111111111111111111111111",
    _eventName: ["Will Apple stock reach $300 by t", "he end of 2017?"],
    _eventResultNames: ["first", "second", "third"],
    _numOfResults: 3,
    _lastResultIndex: 2,
    _arbitrationEndBlock: 200,
    _consensusThreshold: CONSENSUS_THRESHOLD
  };

  let addressManager;
  let oracleFactory;
  let oracle;

  beforeEach(blockHeightManager.snapshot);
  afterEach(blockHeightManager.revert);

  beforeEach(async function() {
    addressManager = await AddressManager.deployed({ from: ADMIN });

    oracleFactory = await OracleFactory.deployed(addressManager.address, { from: ADMIN });
    await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: ADMIN });
    assert.equal(await addressManager.getOracleFactoryAddress(0), oracleFactory.address);
  });

  describe('constructor', async function() {
    it('throws if the AddressManager address is invalid', async function() {
      try {
        await OracleFactory.new(0, { from: ADMIN });
        assert.fail();
      } catch(e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('createCentralizedOracle()', async function() {
    it('initializes all the values', async function() {
      let tx = await oracleFactory.createCentralizedOracle(...Object.values(CORACLE_PARAMS), { from: USER1 });
      let centralizedOracle = CentralizedOracle.at(tx.logs[0].args._contractAddress);

      assert.equal(await centralizedOracle.owner.call(), USER1);
      assert.equal(await centralizedOracle.oracle.call(), ORACLE);
      assert.equal(await centralizedOracle.eventAddress.call(), CORACLE_PARAMS._eventAddress);
      assert.equal(web3.toUtf8(await centralizedOracle.eventName.call(0)), CORACLE_PARAMS._eventName[0]);
      assert.equal(web3.toUtf8(await centralizedOracle.eventName.call(1)), CORACLE_PARAMS._eventName[1]);
      assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(0)), CORACLE_PARAMS._eventResultNames[0]);
      assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(1)), CORACLE_PARAMS._eventResultNames[1]);
      assert.equal(web3.toUtf8(await centralizedOracle.eventResultNames.call(2)), CORACLE_PARAMS._eventResultNames[2]);
      assert.equal((await centralizedOracle.numOfResults.call()).toNumber(), CORACLE_PARAMS._numOfResults);
      assert.equal(await centralizedOracle.bettingEndBlock.call(), CORACLE_PARAMS._bettingEndBlock);
      assert.equal(await centralizedOracle.resultSettingEndBlock.call(), CORACLE_PARAMS._resultSettingEndBlock);
      assert.equal((await centralizedOracle.consensusThreshold.call()).toString(), 
        CORACLE_PARAMS._consensusThreshold.toString());
    });

    it('throws if the CentralizedOracle has already been created', async function() {
      let tx = await oracleFactory.createCentralizedOracle(...Object.values(CORACLE_PARAMS), { from: USER1 });
      let centralizedOracle = CentralizedOracle.at(tx.logs[0].args._contractAddress);

      try {
        await oracleFactory.createCentralizedOracle(...Object.values(CORACLE_PARAMS), { from: USER1 });
        assert.fail();
      } catch(e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('createDecentralizedOracle()', async function() {
    it('initializes all the values', async function() {
      let tx = await oracleFactory.createDecentralizedOracle(...Object.values(DORACLE_PARAMS), { from: USER1 });
      let decentralizedOracle = DecentralizedOracle.at(tx.logs[0].args._contractAddress);

      assert.equal(await decentralizedOracle.eventAddress.call(), DORACLE_PARAMS._eventAddress);
      assert.equal(web3.toUtf8(await decentralizedOracle.eventName.call(0)), DORACLE_PARAMS._eventName[0]);
      assert.equal(web3.toUtf8(await decentralizedOracle.eventName.call(1)), DORACLE_PARAMS._eventName[1]);
      assert.equal(web3.toUtf8(await decentralizedOracle.eventResultNames.call(0)), DORACLE_PARAMS._eventResultNames[0]);
      assert.equal(web3.toUtf8(await decentralizedOracle.eventResultNames.call(1)), DORACLE_PARAMS._eventResultNames[1]);
      assert.equal(web3.toUtf8(await decentralizedOracle.eventResultNames.call(2)), DORACLE_PARAMS._eventResultNames[2]);
      assert.equal((await decentralizedOracle.numOfResults.call()).toNumber(), DORACLE_PARAMS._numOfResults);
      assert.equal(await decentralizedOracle.lastResultIndex.call(), DORACLE_PARAMS._lastResultIndex);
      assert.equal((await decentralizedOracle.arbitrationEndBlock.call()).toNumber(), 
        DORACLE_PARAMS._arbitrationEndBlock);
    });

    it('throws if the DecentralizedOracle has already been created', async function() {
      let tx = await oracleFactory.createDecentralizedOracle(...Object.values(DORACLE_PARAMS), { from: USER1 });
      let decentralizedOracle = DecentralizedOracle.at(tx.logs[0].args._contractAddress);

      try {
        await oracleFactory.createDecentralizedOracle(...Object.values(DORACLE_PARAMS), { from: USER1 });
        assert.fail();
      } catch(e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('doesCentralizedOracleExist()', async function() {
    it('returns true if the CentralizedOracle exists', async function() {
      assert.isFalse(await oracleFactory.doesCentralizedOracleExist(...Object.values(CORACLE_PARAMS)));

      await oracleFactory.createCentralizedOracle(...Object.values(CORACLE_PARAMS), { from: USER1 });
      assert.isTrue(await oracleFactory.doesCentralizedOracleExist(...Object.values(CORACLE_PARAMS)));
    });

    it('returns false if the CentralizedOracle does not exist', async function() {
      assert.isFalse(await oracleFactory.doesCentralizedOracleExist(...Object.values(CORACLE_PARAMS)));

      await oracleFactory.createCentralizedOracle(...Object.values(CORACLE_PARAMS), { from: USER1 });
      assert.isTrue(await oracleFactory.doesCentralizedOracleExist(...Object.values(CORACLE_PARAMS)));

      const params = {
        _oracle: ORACLE,
        _eventAddress: "0x1111111111111111111111111111111111111111",
        _eventName: ["Will Apple stock reach $300 by t", "he end of 2017?"],
        _eventResultNames: ["first", "second"],
        _numOfResults: 3,
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110,
        _consensusThreshold: CONSENSUS_THRESHOLD
      };
      assert.isFalse(await oracleFactory.doesCentralizedOracleExist(...Object.values(params)));
    });
  });

  describe('doesDecentralizedOracleExist()', async function() {
    it('returns true if the DecentralizedOracle exists', async function() {
      assert.isFalse(await oracleFactory.doesDecentralizedOracleExist(...Object.values(DORACLE_PARAMS)));

      await oracleFactory.createDecentralizedOracle(...Object.values(DORACLE_PARAMS), { from: USER1 });
      assert.isTrue(await oracleFactory.doesDecentralizedOracleExist(...Object.values(DORACLE_PARAMS)));
    });

    it('returns false if the DecentralizedOracle does not exist', async function() {
      assert.isFalse(await oracleFactory.doesDecentralizedOracleExist(...Object.values(DORACLE_PARAMS)));

      await oracleFactory.createDecentralizedOracle(...Object.values(DORACLE_PARAMS), { from: USER1 });
      assert.isTrue(await oracleFactory.doesDecentralizedOracleExist(...Object.values(DORACLE_PARAMS)));

      const params = {
        _eventAddress: "0x1111111111111111111111111111111111111111",
        _eventName: ["Will Apple stock reach $300 by t", "he end of 2017?"],
        _eventResultNames: ["first", "second"],
        _numOfResults: 3,
        _lastResultIndex: 2,
        _arbitrationEndBlock: 200,
        _consensusThreshold: CONSENSUS_THRESHOLD
      };
      assert.isFalse(await oracleFactory.doesDecentralizedOracleExist(...Object.values(params)));
    });
  });
});
