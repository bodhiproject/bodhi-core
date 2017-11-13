const ByteUtils = artifacts.require('./libs/ByteUtils.sol');
const BlockHeightManager = require('./helpers/block_height_manager');

contract('ByteUtils', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);

    let instance;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        instance = await ByteUtils.deployed();
    });

    describe.only('isEmpty', async function() {
        it('should return true on an empty bytes32', async function() {
            assert.equal(await instance.isEmpty(""), true);
        });
    });
});
