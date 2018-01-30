module.exports = class TimeMachine {
  constructor(web3) {
    this.web3 = web3;
  }

  increaseTime(increaseSec) {
    const id = new Date().getTime();

    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [increaseSec],
        id: id,
      }, err1 => {
        if (err1) {
          return reject(err1);
        }

        web3.currentProvider.sendAsync({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: id + 1,
        }, (err2, res) => {
          return err2 ? reject(err2) : resolve(res);
        });
      });
    });
  }

  mine() {
    new Promise((resolve, reject) => {
      this.web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime(),
        params: [],
      }, (err, res) => {
        if (err) {
          console.error(`Error mining block: ${err.message}`);
          return reject(err);
        }

        return resolve();
      });
    });
  }

  snapshot() {
    return new Promise((resolve, reject) => {
      this.web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: new Date().getTime(),
        params: [],
      }, (err, res) => {
        if (err) {
          return reject(err);
        }

        this.snapshotId = web3.toDecimal(res.result);
        return resolve();
      });
    });
  }

  revert() {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_revert',
        id: new Date().getTime(),
        params: [this.snapshotId],
      }, (err, res) => {
        if (err) {
          return reject(err);
        }

        return resolve(this.snapshot());
      });
    });
  }
};
