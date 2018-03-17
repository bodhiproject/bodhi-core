const BodhiToken = artifacts.require('../../contracts/tokens/BodhiToken.sol');
const Utils = require('./utils');

const BOT_DECIMALS = 8;
const BODHI_TOKENS_BALANCE = Utils.getBigNumberWithDecimals(100000, BOT_DECIMALS);

function addBodhiTokensToAccounts(admin, accounts) {
  const tokenContract = await BodhiToken.deployed({ from: admin });
  const expectedBalance = BODHI_TOKENS_BALANCE.toString();

  await tokenContract.mintByOwner(accounts[0], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[0])).toString(), expectedBalance);

  await token.mintByOwner(accounts[1], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[1])).toString(), expectedBalance);

  await token.mintByOwner(accounts[2], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[2])).toString(), expectedBalance);

  await token.mintByOwner(accounts[3], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[3])).toString(), expectedBalance);

  await token.mintByOwner(accounts[4], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[4])).toString(), expectedBalance);

  await token.mintByOwner(accounts[5], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[5])).toString(), expectedBalance);

  await token.mintByOwner(accounts[6], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[6])).toString(), expectedBalance);

  await token.mintByOwner(accounts[7], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[accounts[7]])).toString(), expectedBalance);

  await token.mintByOwner(accounts[8], BODHI_TOKENS_BALANCE, { from: admin });
  assert.equal((await token.balanceOf(accounts[accounts[8]])).toString(), expectedBalance);
}