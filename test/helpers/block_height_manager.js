const web3 = global.web3;
const bluebird = require('bluebird');

function BlockHeightManager() {
  let getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);
  let snapshotId;

  this.proceedBlock = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime(),
      }, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  this.mine = async (numOfBlocks) => {
    let i = 0;
    for (i = 0; i < numOfBlocks; i++) {
      await this.proceedBlock();
    }
  }

  this.mineTo = async (height) => {
    let currentHeight = await getBlockNumber(); 
    if (currentHeight > height) {
      throw new Error('Expecting height: ' + height + ' is not reachable');
    }

    return this.mine(height - currentHeight);
  }

  this.revert = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_revert',
        id: new Date().getTime(),
        params: [snapshotId]
      }, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(this.snapshot());
      });
    });
  }

  this.snapshot = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: new Date().getTime(),
        params: []
      }, (err, result) => {
        if (err) {
          return reject(err);
        }

        snapshotId = web3.toDecimal(result.result);
        return resolve();
      });
    })
  }
}

module.exports = BlockHeightManager;
