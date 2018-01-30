const web3 = global.web3;

module.exports = class Utils {
  // Converts the amount to a big number given the number of decimals
  static getBigNumberWithDecimals(amount, numOfDecimals) {
    return web3.toBigNumber(amount * Math.pow(10, numOfDecimals));
  }

  // Gets the unix time in seconds of the current block
  static getCurrentBlockTime() {
    const blockNum = web3.eth.blockNumber;
    const block = web3.eth.getBlock(blockNum);
    return block.timestamp;
  }
}
