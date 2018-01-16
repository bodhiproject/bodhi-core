const ByteUtilsMock = artifacts.require('./mocks/ByteUtilsMock.sol');

contract('ByteUtils', (accounts) => {
  let instance;

  before(async () => {
    instance = await ByteUtilsMock.new();
  });

  describe('isEmpty', () => {
    it('should return true for an empty string', async () => {
      assert.equal(await instance.isEmpty(''), true);
    });

    it('should return false for a non-empty string', async () => {
      assert.equal(await instance.isEmpty('hello world'), false);
    });
  });

  describe('bytesArrayToString', () => {
    it('should return the correct concatenated string', async () => {
      let test = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef'];
      assert.equal(await instance.bytesArrayToString(test), test.join(''), 'test 1 does not match');

      test = ['Who will be the next president i', 'n the 2020 election?'];
      assert.equal(await instance.bytesArrayToString(test), test.join(''), 'test 2 does not match');

      test = ['Who will be the next president i', ' n the 2020 election?'];
      assert.equal(await instance.bytesArrayToString(test), test.join(''), 'test 3 does not match');

      test = ['Hello world!'];
      assert.equal(await instance.bytesArrayToString(test), test.join(''), 'test 4 does not match');

      test = [];
      assert.equal(await instance.bytesArrayToString(test), test.join(''), 'test 5 does not match');
    });

    it('should only concatenate first 10 array slots of the name array', async () => {
      const array = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        'abcdefghijklmnopqrstuvwxyzabcdef'];
      const expected = 'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef';
      assert.equal(await instance.bytesArrayToString(array), expected, 'Expected string does not match');
    });

    it('should allow a space as the last character', async () => {
      const array = ['abcdefghijklmnopqrstuvwxyzabcde ', 'fghijklmnopqrstuvwxyz'];
      const expected = 'abcdefghijklmnopqrstuvwxyzabcde fghijklmnopqrstuvwxyz';
      assert.equal(await instance.bytesArrayToString(array), expected, 'Expected string does not match');
    });

    it('should allow a space as the first character if the next character is not empty', async () => {
      const array = ['abcdefghijklmnopqrstuvwxyzabcdef', ' ghijklmnopqrstuvwxyz'];
      const expected = 'abcdefghijklmnopqrstuvwxyzabcdef ghijklmnopqrstuvwxyz';
      assert.equal(await instance.bytesArrayToString(array), expected, 'Expected string does not match');
    });
  });
});
