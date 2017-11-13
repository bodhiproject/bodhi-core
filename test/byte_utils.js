const ByteUtilsMock = artifacts.require('./mocks/ByteUtilsMock.sol');
const BlockHeightManager = require('./helpers/block_height_manager');

contract('ByteUtils', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);

    let instance;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        instance = await ByteUtilsMock.new();
    });

    describe('isEmpty', async function() {
        it('should return true for an empty string', async function() {
            assert.equal(await instance.isEmpty(''), true);
        });

        it('should return false for a non-empty string', async function() {
            assert.equal(await instance.isEmpty('hello world'), false);
        });
    });

    describe('toString', async function() {
        it('should return the string', async function() {
            var test = ["Who will be the next president i", "n the 2020 election?"];
            assert.equal(await instance.toString(test), test.join(''), 'test 2 does not match');
        });

        // it('should return the correct concatenated string', async function() {
        //     // var test = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        //     //     'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        //     //     'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        //     //     'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
        //     //     'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef'];
        //     // assert.equal(await instance.toString(test), test.join(''), 'test 1 does not match');

        //     var test = ["Who will be the next president i", "n the 2020 election?"];
        //     assert.equal(await instance.toString(test), test.join(''), 'test 2 does not match');
        // });
    });
});
