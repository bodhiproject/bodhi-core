function getParamFromTransaction(transaction, paramName) {
    assert.isObject(transaction);

    let logs = transaction.logs;
    assert.equal(logs.length, 1, 'Too many logs found.');

    return logs[0].args[paramName];
}

Object.assign(exports, {
    getParamFromTransaction,
});
