function getAddressFromTransaction(transaction) {
    assert.isObject(transaction);

    let logs = transaction.logs;
    let address = logs[0].args['address'];
    return address;
}
