const BodhiToken = artifacts.require('./tokens/BodhiToken.sol');
const BlockHeightManager = require('../helpers/block_height_manager');
const Utils = require('../helpers/utils');
const assert = require('chai').assert;
const SolAssert = require('../helpers/sol_assert');

contract('BodhiToken', (accounts) => {
  const blockHeightManager = new BlockHeightManager(web3);
  const owner = accounts[0];

  let token;
  let decimals;

  before(blockHeightManager.snapshot);
  afterEach(blockHeightManager.revert);

  beforeEach(async () => {
    token = await BodhiToken.deployed({ from: owner });
    decimals = await token.decimals.call();
  });

  describe('Initialization', async () => {
    it('initializes all the values', async () => {
      const tokenTotalSupply = await token.tokenTotalSupply.call();
      const expectedTokenTotalSupply = Utils.getBigNumberWithDecimals(100e6, decimals);
      assert.equal(tokenTotalSupply.toString(), expectedTokenTotalSupply.toString(), 'tokenTotalSupply does not match');
    });
  });

  describe('mint', () => {
    it('allows only the owner to mint tokens', async () => {
      let totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toString(), 0, 'Initial totalSupply should be 0');

      const tokenTotalSupply = await token.tokenTotalSupply.call();
      await token.mintByOwner(owner, tokenTotalSupply, { from: owner });

      totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toString(), tokenTotalSupply.toString(), 'totalSupply should equal tokenTotalSupply');
    });

    it('does not allow an address other than the owner to mint tokens', async () => {
      let totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toString(), 0, 'totalSupply should be 0');

      try {
        await token.mintByOwner(accounts[1], 1, { from: accounts[1] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      try {
        await token.mintByOwner(accounts[2], 1, { from: accounts[2] });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toString(), 0, 'totalSupply should be 0');
    });

    it('throws if trying to mint more than the tokenTotalSupply', async () => {
      let totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toString(), 0, 'totalSupply should be 0');

      const tokenTotalSupply = await token.tokenTotalSupply.call();
      await token.mintByOwner(owner, tokenTotalSupply, { from: owner });

      totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toString(), tokenTotalSupply.toString(), 'totalSupply should equal tokenTotalSupply');

      try {
        await token.mintByOwner(owner, 1, { from: owner });
        assert.fail();
      } catch (e) {
        SolAssert.assertRevert(e);
      }

      totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toString(), tokenTotalSupply.toString(), 'totalSupply should equal tokenTotalSupply');
    });
  });
});
