const SolAssert = {
  assertRevert(error) {
    assert.isAbove(error.message.search('revert'), -1, 'Revert error must be returned');
  },
  assertInvalidOpcode(error) {
    assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');
  },
  assertBNEqual(first, second) {
    assert.equal(first.toString(), second.toString());
  },
  assertBNNotEqual(first, second) {
    assert.notEqual(first.toString(), second.toString());
  },
};

module.exports = SolAssert;
