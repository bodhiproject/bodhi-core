function getParamFromTransaction(transaction, paramName) {
  assert.isObject(transaction);

  const logs = transaction.logs;
  assert.equal(logs.length, 1, 'Too many logs found.');

  return logs[0].args[paramName];
}

function getBigNumberWithDecimals(amount, numOfDecimals) {
  return web3.toBigNumber(amount * Math.pow(10, numOfDecimals));
}

Object.assign(exports, {
  getParamFromTransaction,
  getBigNumberWithDecimals,
});
