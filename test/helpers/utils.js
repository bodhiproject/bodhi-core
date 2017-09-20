function getAddressFromTransaction(transaction) {
    assert.isObject(transaction);

    let logs = transaction.logs;
    let address = logs[0].address;
    return address;
}

Object.assign(exports, {
    getAddressFromTransaction,
});
