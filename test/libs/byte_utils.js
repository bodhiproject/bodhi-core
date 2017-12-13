const ByteUtilsMock = artifacts.require('./mocks/ByteUtilsMock.sol');

contract('ByteUtils', function(accounts) {
    let instance;

    before(async function() {
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

    // TODO: Uncomment when Truffle is fixed. It hangs on these test.
    // describe('toString', async function() {
    //     it('should return the correct concatenated string', async function() {
    //         var test = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef'];
    //         assert.equal(await instance.toString(test), test.join(''), 'test 1 does not match');

    //         test = ["Who will be the next president i", "n the 2020 election?"];
    //         assert.equal(await instance.toString(test), test.join(''), 'test 2 does not match');

    //         test = ["Who will be the next president i", " n the 2020 election?"];
    //         assert.equal(await instance.toString(test), test.join(''), 'test 3 does not match');

    //         test = ["Hello world!"];
    //         assert.equal(await instance.toString(test), test.join(''), 'test 4 does not match');

    //         test = [];
    //         assert.equal(await instance.toString(test), test.join(''), 'test 5 does not match');
    //     });

    //     it('should only concatenate first 10 array slots of the name array', async function() {
    //         let array = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
    //             'abcdefghijklmnopqrstuvwxyzabcdef'];
    //         let expected = 'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
    //             'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
    //             'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
    //             'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef';
    //         assert.equal(await instance.toString(array), expected, 'Expected string does not match');
    //     });

    //     it('should allow a space as the last character', async function() {
    //         let array = ['abcdefghijklmnopqrstuvwxyzabcde ', 'fghijklmnopqrstuvwxyz'];
    //         let expected = 'abcdefghijklmnopqrstuvwxyzabcde fghijklmnopqrstuvwxyz';
    //         assert.equal(await instance.toString(array), expected, 'Expected string does not match');
    //     });

    //     it('should allow a space as the first character if the next character is not empty', async function() {
    //         let array = ['abcdefghijklmnopqrstuvwxyzabcdef', ' ghijklmnopqrstuvwxyz'];
    //         let expected = 'abcdefghijklmnopqrstuvwxyzabcdef ghijklmnopqrstuvwxyz';
    //         assert.equal(await instance.toString(array), expected, 'Expected string does not match');
    //     });
    // });
});
