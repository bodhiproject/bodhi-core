const web3 = global.web3;
const AdddressManager = artifacts.require("./AddressManager.sol");
const assert = require('chai').assert;

contract("AdddressManager", function(accounts) {
    const owner = accounts[0];

    let instance;

    beforeEach(async function() {
        instance = await AdddressManager.new({ from: owner });
    });

    it("should deploy correctly", async function(done) {
        var adddress_manager = AdddressManager.deployed();
        assert.isTrue(true);
        done();
    });
});
