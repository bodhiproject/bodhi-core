const web3 = global.web3;
const assert = require('chai').assert;

const AdddressManager = artifacts.require('./AddressManager.sol');
const BlockHeightManager = require('../helpers/block_height_manager');
const SolAssert = require('../helpers/sol_assert');
const ContractHelper = require('../helpers/contract_helper');

contract('AdddressManager', (accounts) => {
  const blockHeightManager = new BlockHeightManager(web3);

  const OWNER = accounts[0];
  const WHITELISTED_ADDRESS = accounts[1];
  const USER1 = accounts[2];
  const tokenAddress1 = '0x1111111111111111111111111111111111111111';
  const tokenAddress2 = '0x2222222222222222222222222222222222222222';
  const eventAddress1 = '0x1212121212121212121212121212121212121212';
  const eventAddress2 = '0x1313131313131313131313131313131313131313';
  const eventAddress3 = '0x1414141414141414141414141414141414141414';
  const oracleAddress1 = '0x5555555555555555555555555555555555555555';
  const oracleAddress2 = '0x6666666666666666666666666666666666666666';
  const oracleAddress3 = '0x7777777777777777777777777777777777777777';

  let addressManager;

  beforeEach(blockHeightManager.snapshot);
  afterEach(blockHeightManager.revert);

  beforeEach(async () => {
    addressManager = await AdddressManager.deployed({ from: OWNER });
  });

  describe('BodhiTokenAddress', () => {
    it('should return the correct address if set', async () => {
      assert.equal(await addressManager.bodhiTokenAddress.call(), 0);

      await addressManager.setBodhiTokenAddress(tokenAddress1, { from: OWNER });
      assert.equal(await addressManager.bodhiTokenAddress.call(), tokenAddress1);
    });

    it('allows replacing an existing address', async () => {
      assert.equal(await addressManager.bodhiTokenAddress.call(), 0);

      await addressManager.setBodhiTokenAddress(tokenAddress1, { from: OWNER });
      assert.equal(await addressManager.bodhiTokenAddress.call(), tokenAddress1);

      await addressManager.setBodhiTokenAddress(tokenAddress2, { from: OWNER });
      assert.equal(await addressManager.bodhiTokenAddress.call(), tokenAddress2);
    });

    it('throws if a non-OWNER tries setting the address', async () => {
      assert.equal(await addressManager.bodhiTokenAddress.call(), 0);

      try {
        await addressManager.setBodhiTokenAddress(tokenAddress1, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await addressManager.bodhiTokenAddress.call(), 0);
    });

    it('throws if trying to set an invalid address', async () => {
      assert.equal(await addressManager.bodhiTokenAddress.call(), 0);

      try {
        await addressManager.setBodhiTokenAddress(0, { from: OWNER });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('EventFactoryAddresses', () => {
    it('should return the addresses if set', async () => {
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), 0);
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(1), 0);
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(2), 0);

      await addressManager.setEventFactoryAddress(eventAddress1, { from: OWNER });
      await addressManager.setEventFactoryAddress(eventAddress2, { from: OWNER });
      await addressManager.setEventFactoryAddress(eventAddress3, { from: OWNER });

      assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), eventAddress1);
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(1), eventAddress2);
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(2), eventAddress3);
    });

    it('should return the last EventFactory index', async () => {
      assert.equal(await addressManager.getLastEventFactoryIndex(), 0);

      await addressManager.setEventFactoryAddress(eventAddress1, { from: OWNER });
      assert.equal(await addressManager.getLastEventFactoryIndex(), 0);

      await addressManager.setEventFactoryAddress(eventAddress2, { from: OWNER });
      assert.equal(await addressManager.getLastEventFactoryIndex(), 1);

      await addressManager.setEventFactoryAddress(eventAddress3, { from: OWNER });
      assert.equal(await addressManager.getLastEventFactoryIndex(), 2);
    });

    it('throws if a non-OWNER tries setting the address', async () => {
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), 0);

      try {
        await addressManager.setEventFactoryAddress(eventAddress1, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), 0);
    });

    it('throws if trying to set an invalid address', async () => {
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), 0);

      try {
        await addressManager.setEventFactoryAddress(0, { from: OWNER });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('setCurrentEventFactoryIndex()', () => {
    it('allows the OWNER to set the currentEventFactoryIndex', async () => {
      assert.equal(await addressManager.currentEventFactoryIndex.call(), 0);

      await addressManager.setCurrentEventFactoryIndex(5, { from: OWNER });
      assert.equal(await addressManager.currentEventFactoryIndex.call(), 5);

      await addressManager.setCurrentEventFactoryIndex(10, { from: OWNER });
      assert.equal(await addressManager.currentEventFactoryIndex.call(), 10);

      await addressManager.setCurrentEventFactoryIndex(0, { from: OWNER });
      assert.equal(await addressManager.currentEventFactoryIndex.call(), 0);
    });

    it('throws if a non-OWNER tries set the currentEventFactoryIndex', async () => {
      assert.equal(await addressManager.currentEventFactoryIndex.call(), 0);

      try {
        await addressManager.setCurrentEventFactoryIndex(5, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await addressManager.currentEventFactoryIndex.call(), 0);
    });
  });

  describe('OracleFactoryAddresses', () => {
    it('should return the addresses if set', async () => {
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), 0);
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(1), 0);
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(2), 0);

      await addressManager.setOracleFactoryAddress(oracleAddress1, { from: OWNER });
      await addressManager.setOracleFactoryAddress(oracleAddress2, { from: OWNER });
      await addressManager.setOracleFactoryAddress(oracleAddress3, { from: OWNER });

      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), oracleAddress1);
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(1), oracleAddress2);
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(2), oracleAddress3);
    });

    it('should return the last OracleFactory index', async () => {
      assert.equal(await addressManager.getLastOracleFactoryIndex(), 0);

      await addressManager.setOracleFactoryAddress(oracleAddress1, { from: OWNER });
      assert.equal(await addressManager.getLastOracleFactoryIndex(), 0);

      await addressManager.setOracleFactoryAddress(oracleAddress2, { from: OWNER });
      assert.equal(await addressManager.getLastOracleFactoryIndex(), 1);

      await addressManager.setOracleFactoryAddress(oracleAddress3, { from: OWNER });
      assert.equal(await addressManager.getLastOracleFactoryIndex(), 2);
    });

    it('throws if a non-OWNER tries setting the address', async () => {
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), 0);

      try {
        await addressManager.setOracleFactoryAddress(oracleAddress1, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), 0);
    });

    it('throws if trying to set an invalid address', async () => {
      assert.equal(await addressManager.oracleFactoryVersionToAddress.call(0), 0);

      try {
        await addressManager.setOracleFactoryAddress(0, { from: OWNER });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }
    });
  });

  describe('setCurrentOracleFactoryIndex()', () => {
    it('allows the OWNER to set the currentOracleFactoryIndex', async () => {
      assert.equal(await addressManager.currentOracleFactoryIndex.call(), 0);

      await addressManager.setCurrentOracleFactoryIndex(5, { from: OWNER });
      assert.equal(await addressManager.currentOracleFactoryIndex.call(), 5);

      await addressManager.setCurrentOracleFactoryIndex(10, { from: OWNER });
      assert.equal(await addressManager.currentOracleFactoryIndex.call(), 10);

      await addressManager.setCurrentOracleFactoryIndex(0, { from: OWNER });
      assert.equal(await addressManager.currentOracleFactoryIndex.call(), 0);
    });

    it('throws if a non-OWNER tries set the currentOracleFactoryIndex', async () => {
      assert.equal(await addressManager.currentOracleFactoryIndex.call(), 0);

      try {
        await addressManager.setCurrentOracleFactoryIndex(5, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      assert.equal(await addressManager.currentOracleFactoryIndex.call(), 0);
    });
  });

  describe.only('Escrow transfer/withdraw', () => {
    let bodhiToken;
    let escrowAmount;

    beforeEach(async () => {
      bodhiToken = await ContractHelper.mintBodhiTokens(OWNER, accounts);
      await addressManager.setBodhiTokenAddress(bodhiToken.address, { from: OWNER });
      assert.equal(await addressManager.bodhiTokenAddress.call(), bodhiToken.address);

      await addressManager.setEventFactoryAddress(WHITELISTED_ADDRESS, { from: OWNER });
      assert.equal(await addressManager.eventFactoryVersionToAddress.call(0), WHITELISTED_ADDRESS);

      escrowAmount = await addressManager.eventEscrowAmount.call();
    });

    it('can tranfer the escrow', async () => {
      await ContractHelper.approve(bodhiToken, USER1, addressManager.address, escrowAmount);
      await addressManager.transferEscrow(USER1, { from: WHITELISTED_ADDRESS });
      SolAssert.assertBNEqual(await bodhiToken.balanceOf(addressManager.address), escrowAmount);
    });

    it('throws if trying to transfer from a non-whitelisted address', async () => {
      await ContractHelper.approve(bodhiToken, USER1, addressManager.address, escrowAmount);

      try {
        await addressManager.transferEscrow(USER1, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      SolAssert.assertBNEqual(await bodhiToken.balanceOf(addressManager.address), 0);
    });

    it('throws if trying to transfer without enough allowance', async () => {
      await ContractHelper.approve(bodhiToken, USER1, addressManager.address, escrowAmount.sub(1));

      try {
        await addressManager.transferEscrow(USER1, { from: WHITELISTED_ADDRESS });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      SolAssert.assertBNEqual(await bodhiToken.balanceOf(addressManager.address), 0);
    });

    it('can withdraw the escrow', async () => {
      await ContractHelper.approve(bodhiToken, USER1, addressManager.address, escrowAmount);
      await addressManager.transferEscrow(USER1, { from: WHITELISTED_ADDRESS });

      const balanceBefore = await bodhiToken.balanceOf(USER1);

      await addressManager.withdrawEscrow(USER1, escrowAmount, { from: WHITELISTED_ADDRESS });
      SolAssert.assertBNEqual(await bodhiToken.balanceOf(addressManager.address), 0);
      SolAssert.assertBNEqual(await bodhiToken.balanceOf(USER1), balanceBefore.add(escrowAmount));
    });

    it('throws if trying to withdraw from a non-whitelisted address', async () => {
      await ContractHelper.approve(bodhiToken, USER1, addressManager.address, escrowAmount);
      await addressManager.transferEscrow(USER1, { from: WHITELISTED_ADDRESS });
      SolAssert.assertBNEqual(await bodhiToken.balanceOf(addressManager.address), escrowAmount);

      const balanceBefore = await bodhiToken.balanceOf(USER1);

      try {
        await addressManager.withdrawEscrow(USER1, escrowAmount, { from: USER1 });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      SolAssert.assertBNEqual(await bodhiToken.balanceOf(addressManager.address), escrowAmount);
      SolAssert.assertBNEqual(await bodhiToken.balanceOf(USER1), balanceBefore);
    });
  });
});
