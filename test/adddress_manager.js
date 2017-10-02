const web3 = global.web3;
const AdddressManager = artifacts.require("./AddressManager.sol");
const assert = require('chai').assert;

contract("AdddressManager", function(accounts) {
    const owner = accounts[0];
    const tokenAddress = "0x1111111111111111111111111111111111111111";

    let instance;

    beforeEach(async function() {
        instance = await AdddressManager.new({ from: owner });
    });

    describe("BodhiTokenAddress", async function() {
        it("should return the correct address if set", async function() {
            assert.equal(await instance.getBodhiTokenAddress(), 0, "Token address should be unset");

            await instance.setBodhiTokenAddress(tokenAddress, { from: owner });
            assert.equal(await instance.getBodhiTokenAddress(), tokenAddress, "Token address does not match");
        });

        it("throws if setting the address from not the owner", async function() {
            assert.equal(await instance.getBodhiTokenAddress(), 0, "Token address should be unset");

            try {
                await instance.setBodhiTokenAddress(tokenAddress, { from: accounts[1] });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }

            assert.equal(await instance.getBodhiTokenAddress(), 0, "Token address should still be unset");
        });

        it("throws if trying to set an invalid address", async function() {
            assert.equal(await instance.getBodhiTokenAddress(), 0, "Token address should be unset");

            try {
                await instance.setBodhiTokenAddress(0, { from: owner });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });
});
