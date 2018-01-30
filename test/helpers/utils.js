const web3 = global.web3;

class Utils {
  // Converts the amount to a big number given the number of decimals
  getBigNumberWithDecimals(amount, numOfDecimals) {
    return web3.toBigNumber(amount * Math.pow(10, numOfDecimals));
  }

  // Gets the unix time in seconds of the current block
  async getCurrentUnixTime() {
    const blockNum = await web3.eth.getBlockNumber();
    const block = await web3.eth.getBlock(blockNum);
    return block.timestamp;
  }
}

module.exports = Utils;
