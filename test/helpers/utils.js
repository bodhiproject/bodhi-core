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

  /*
  * Calculates the new big number after a percentage increase
  * @param amount {BN} The original number to increase.
  * @param percentIncrease {Number} The percentage to increase as a whole number.
  * @return {BN} The big number with percentage increase.
  */
  static getPercentageIncrease(amount, percentIncrease) {
    const increaseAmount = amount.mul(percentIncrease).div(100);
    return web3.toBigNumber(Math.floor(amount.add(increaseAmount)));
  }
};
