const web3 = global.web3;

module.exports = class Utils {
  // Converts the amount to a big number given the number of decimals
  static getBigNumberWithDecimals(amount, numOfDecimals) {
    return web3.toBigNumber(amount * (10 ** numOfDecimals));
  }

  // Gets the unix time in seconds of the current block
  static getCurrentBlockTime() {
    return web3.eth.getBlock(web3.eth.blockNumber).timestamp;
  }
};
