const web3 = global.web3;
const assert = require('chai').assert;

const AdddressManager = artifacts.require('./AddressManager.sol');
const BlockHeightManager = require('../helpers/block_height_manager');
const SolAssert = require('../helpers/sol_assert');

contract('AdddressManager', (accounts) => {
  const blockHeightManager = new BlockHeightManager(web3);

  const owner = accounts[0];
  const tokenAddress1 = '0x1111111111111111111111111111111111111111';
  const tokenAddress2 = '0x2222222222222222222222222222222222222222';
  const eventAddress1 = '0x1212121212121212121212121212121212121212';
  const eventAddress2 = '0x1313131313131313131313131313131313131313';
  const eventAddress3 = '0x1414141414141414141414141414141414141414';
  const oracleAddress1 = '0x5555555555555555555555555555555555555555';
  const oracleAddress2 = '0x6666666666666666666666666666666666666666';
  const oracleAddress3 = '0x7777777777777777777777777777777777777777';

  let instance;

  beforeEach(blockHeightManager.snapshot);
  afterEach(blockHeightManager.revert);

  beforeEach(async () => {
    instance = await AdddressManager.deployed({ from: owner });
  });

  describe('BodhiTokenAddress', () => {
    it('should return the correct address if set', async () => {
      assert.equal(await instance.bodhiTokenAddress.call(), 0);

      await instance.setBodhiTokenAddress(tokenAddress1, { from: owner });
      assert.equal(await instance.bodhiTokenAddress.call(), tokenAddress1);
    });

    it('allows replacing an existing address', async () => {
      assert.equal(await instance.bodhiTokenAddress.call(), 0);

      await instance.setBodhiTokenAddress(tokenAddress1, { from: owner });
      assert.equal(await instance.bodhiTokenAddress.call(), tokenAddress1);

      await instance.setBodhiTokenAddress(tokenAddress2, { from: owner });
      assert.equal(await instance.bodhiTokenAddress.call(), tokenAddress2);
    });

    it('throws if a non-owner tries setting the address', async () => {
      assert.equal(await instance.bodhiTokenAddress.call(), 0);

      try {
        await instance.setBodhiTokenAddress(tokenAddress1, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await instance.bodhiTokenAddress.call(), 0);
    });

    it('throws if trying to set an invalid address', async () => {
      assert.equal(await instance.bodhiTokenAddress.call(), 0);

      try {
        await instance.setBodhiTokenAddress(0, { from: owner });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('EventFactoryAddresses', () => {
    it('should return the addresses if set', async () => {
      assert.equal(await instance.eventFactoryVersionToAddress.call(0), 0);
      assert.equal(await instance.eventFactoryVersionToAddress.call(1), 0);
      assert.equal(await instance.eventFactoryVersionToAddress.call(2), 0);

      await instance.setEventFactoryAddress(eventAddress1, { from: owner });
      await instance.setEventFactoryAddress(eventAddress2, { from: owner });
      await instance.setEventFactoryAddress(eventAddress3, { from: owner });

      assert.equal(await instance.eventFactoryVersionToAddress.call(0), eventAddress1);
      assert.equal(await instance.eventFactoryVersionToAddress.call(1), eventAddress2);
      assert.equal(await instance.eventFactoryVersionToAddress.call(2), eventAddress3);
    });

    it('should return the last EventFactory index', async () => {
      assert.equal(await instance.getLastEventFactoryIndex(), 0);

      await instance.setEventFactoryAddress(eventAddress1, { from: owner });
      assert.equal(await instance.getLastEventFactoryIndex(), 0);

      await instance.setEventFactoryAddress(eventAddress2, { from: owner });
      assert.equal(await instance.getLastEventFactoryIndex(), 1);

      await instance.setEventFactoryAddress(eventAddress3, { from: owner });
      assert.equal(await instance.getLastEventFactoryIndex(), 2);
    });

    it('throws if a non-owner tries setting the address', async () => {
      assert.equal(await instance.eventFactoryVersionToAddress.call(0), 0);

      try {
        await instance.setEventFactoryAddress(eventAddress1, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await instance.eventFactoryVersionToAddress.call(0), 0);
    });

    it('throws if trying to set an invalid address', async () => {
      assert.equal(await instance.eventFactoryVersionToAddress.call(0), 0);

      try {
        await instance.setEventFactoryAddress(0, { from: owner });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('setCurrentEventFactoryIndex()', () => {
    it('allows the owner to set the currentEventFactoryIndex', async () => {
      assert.equal(await instance.currentEventFactoryIndex.call(), 0);

      await instance.setCurrentEventFactoryIndex(5, { from: owner });
      assert.equal(await instance.currentEventFactoryIndex.call(), 5);

      await instance.setCurrentEventFactoryIndex(10, { from: owner });
      assert.equal(await instance.currentEventFactoryIndex.call(), 10);

      await instance.setCurrentEventFactoryIndex(0, { from: owner });
      assert.equal(await instance.currentEventFactoryIndex.call(), 0);
    });

    it('throws if a non-owner tries set the currentEventFactoryIndex', async () => {
      assert.equal(await instance.currentEventFactoryIndex.call(), 0);

      try {
        await instance.setCurrentEventFactoryIndex(5, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await instance.currentEventFactoryIndex.call(), 0);
    });
  });

  describe('OracleFactoryAddresses', () => {
    it('should return the addresses if set', async () => {
      assert.equal(await instance.oracleFactoryVersionToAddress.call(0), 0);
      assert.equal(await instance.oracleFactoryVersionToAddress.call(1), 0);
      assert.equal(await instance.oracleFactoryVersionToAddress.call(2), 0);

      await instance.setOracleFactoryAddress(oracleAddress1, { from: owner });
      await instance.setOracleFactoryAddress(oracleAddress2, { from: owner });
      await instance.setOracleFactoryAddress(oracleAddress3, { from: owner });

      assert.equal(await instance.oracleFactoryVersionToAddress.call(0), oracleAddress1);
      assert.equal(await instance.oracleFactoryVersionToAddress.call(1), oracleAddress2);
      assert.equal(await instance.oracleFactoryVersionToAddress.call(2), oracleAddress3);
    });

    it('should return the last OracleFactory index', async () => {
      assert.equal(await instance.getLastOracleFactoryIndex(), 0);

      await instance.setOracleFactoryAddress(oracleAddress1, { from: owner });
      assert.equal(await instance.getLastOracleFactoryIndex(), 0);

      await instance.setOracleFactoryAddress(oracleAddress2, { from: owner });
      assert.equal(await instance.getLastOracleFactoryIndex(), 1);

      await instance.setOracleFactoryAddress(oracleAddress3, { from: owner });
      assert.equal(await instance.getLastOracleFactoryIndex(), 2);
    });

    it('throws if a non-owner tries setting the address', async () => {
      assert.equal(await instance.oracleFactoryVersionToAddress.call(0), 0);

      try {
        await instance.setOracleFactoryAddress(oracleAddress1, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await instance.oracleFactoryVersionToAddress.call(0), 0);
    });

    it('throws if trying to set an invalid address', async () => {
      assert.equal(await instance.oracleFactoryVersionToAddress.call(0), 0);

      try {
        await instance.setOracleFactoryAddress(0, { from: owner });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('setCurrentOracleFactoryIndex()', () => {
    it('allows the owner to set the currentOracleFactoryIndex', async () => {
      assert.equal(await instance.currentOracleFactoryIndex.call(), 0);

      await instance.setCurrentOracleFactoryIndex(5, { from: owner });
      assert.equal(await instance.currentOracleFactoryIndex.call(), 5);

      await instance.setCurrentOracleFactoryIndex(10, { from: owner });
      assert.equal(await instance.currentOracleFactoryIndex.call(), 10);

      await instance.setCurrentOracleFactoryIndex(0, { from: owner });
      assert.equal(await instance.currentOracleFactoryIndex.call(), 0);
    });

    it('throws if a non-owner tries set the currentOracleFactoryIndex', async () => {
      assert.equal(await instance.currentOracleFactoryIndex.call(), 0);

      try {
        await instance.setCurrentOracleFactoryIndex(5, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await instance.currentOracleFactoryIndex.call(), 0);
    });
  });
});
