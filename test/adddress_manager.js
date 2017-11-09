const web3 = global.web3;
const AdddressManager = artifacts.require("./AddressManager.sol");
const assert = require('chai').assert;

contract("AdddressManager", function(accounts) {
    const owner = accounts[0];
    const tokenAddress1 = "0x1111111111111111111111111111111111111111";
    const tokenAddress2 = "0x2222222222222222222222222222222222222222";
    const eventAddress1 = "0x1212121212121212121212121212121212121212";
    const eventAddress2 = "0x1313131313131313131313131313131313131313";
    const eventAddress3 = "0x1414141414141414141414141414141414141414";
    const oracleAddress1 = "0x5555555555555555555555555555555555555555";
    const oracleAddress2 = "0x6666666666666666666666666666666666666666";
    const oracleAddress3 = "0x7777777777777777777777777777777777777777";

    let instance;

    beforeEach(async function() {
        instance = await AdddressManager.new({ from: owner });
    });

    describe("BodhiTokenAddress", async function() {
        it("should return the correct address if set", async function() {
            assert.equal(await instance.getBodhiTokenAddress(), 0, "Token address should be unset");

            await instance.setBodhiTokenAddress(tokenAddress1, { from: owner });
            assert.equal(await instance.getBodhiTokenAddress(), tokenAddress1, "Token address does not match");
        });

        it("allows replacing an existing address", async function() {
            assert.equal(await instance.getBodhiTokenAddress(), 0, "Token address should be unset");

            await instance.setBodhiTokenAddress(tokenAddress1, { from: owner });
            assert.equal(await instance.getBodhiTokenAddress(), tokenAddress1, "Token address does not match");

            await instance.setBodhiTokenAddress(tokenAddress2, { from: owner });
            assert.equal(await instance.getBodhiTokenAddress(), tokenAddress2, 
                "Token address replacement does not match");
        });

        it("throws if a non-owner tries setting the address", async function() {
            assert.equal(await instance.getBodhiTokenAddress(), 0, "Token address should be unset");

            try {
                await instance.setBodhiTokenAddress(tokenAddress1, { from: accounts[1] });
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

    describe("EventFactoryAddresses", async function() {
        it("should return the addresses if set", async function() {
            assert.equal(await instance.getEventFactoryAddress(0), 0, "Event address 0 should be unset");
            assert.equal(await instance.getEventFactoryAddress(1), 0, "Event address 1 should be unset");
            assert.equal(await instance.getEventFactoryAddress(2), 0, "Event address 2 should be unset");

            await instance.setEventFactoryAddress(owner, eventAddress1, { from: owner });
            await instance.setEventFactoryAddress(owner, eventAddress2, { from: owner });
            await instance.setEventFactoryAddress(owner, eventAddress3, { from: owner }); 

            assert.equal(await instance.getEventFactoryAddress(0), eventAddress1, "Event address 0 does not match");
            assert.equal(await instance.getEventFactoryAddress(1), eventAddress2, "Event address 1 does not match");
            assert.equal(await instance.getEventFactoryAddress(2), eventAddress3, "Event address 2 does not match");
        });

        it("should return the last EventFactory index", async function() {
            assert.equal(await instance.getLastEventFactoryIndex(), 0, "lastEventFactoryIndex should be 0");

            await instance.setEventFactoryAddress(owner, eventAddress1, { from: owner });
            assert.equal(await instance.getLastEventFactoryIndex(), 0, "lastEventFactoryIndex should be 0");

            await instance.setEventFactoryAddress(owner, eventAddress2, { from: owner });
            assert.equal(await instance.getLastEventFactoryIndex(), 1, "lastEventFactoryIndex should be 1");

            await instance.setEventFactoryAddress(owner, eventAddress3, { from: owner });
            assert.equal(await instance.getLastEventFactoryIndex(), 2, "lastEventFactoryIndex should be 2");
        });

        it("throws if a non-owner tries setting the address", async function() {
            assert.equal(await instance.getEventFactoryAddress(0), 0, "Event address should be unset");

            try {
                await instance.setEventFactoryAddress(accounts[1], eventAddress1, { from: accounts[1] });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }

            assert.equal(await instance.getEventFactoryAddress(0), 0, "Event address should still be unset");
        });

        it("throws if trying to set an invalid address", async function() {
            assert.equal(await instance.getEventFactoryAddress(0), 0, "Event address should be unset");

            try {
                await instance.setEventFactoryAddress(owner, 0, { from: owner });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("OracleFactoryAddresses", async function() {
        it("should return the addresses if set", async function() {
            assert.equal(await instance.getOracleFactoryAddress(0), 0, "Oracle address 0 should be unset");
            assert.equal(await instance.getOracleFactoryAddress(1), 0, "Oracle address 1 should be unset");
            assert.equal(await instance.getOracleFactoryAddress(2), 0, "Oracle address 2 should be unset");

            await instance.setOracleFactoryAddress(owner, oracleAddress1, { from: owner });
            await instance.setOracleFactoryAddress(owner, oracleAddress2, { from: owner });
            await instance.setOracleFactoryAddress(owner, oracleAddress3, { from: owner }); 

            assert.equal(await instance.getOracleFactoryAddress(0), oracleAddress1, "Oracle address 0 does not match");
            assert.equal(await instance.getOracleFactoryAddress(1), oracleAddress2, "Oracle address 1 does not match");
            assert.equal(await instance.getOracleFactoryAddress(2), oracleAddress3, "Oracle address 2 does not match");
        });

        it("should return the last OracleFactory index", async function() {
            assert.equal(await instance.getLastOracleFactoryIndex(), 0, "lastOracleFactoryIndex should be 0");

            await instance.setOracleFactoryAddress(owner, oracleAddress1, { from: owner });
            assert.equal(await instance.getLastOracleFactoryIndex(), 0, "lastOracleFactoryIndex should be 0");

            await instance.setOracleFactoryAddress(owner, oracleAddress2, { from: owner });
            assert.equal(await instance.getLastOracleFactoryIndex(), 1, "lastOracleFactoryIndex should be 1");

            await instance.setOracleFactoryAddress(owner, oracleAddress3, { from: owner });
            assert.equal(await instance.getLastOracleFactoryIndex(), 2, "lastOracleFactoryIndex should be 2");
        });

        it("throws if a non-owner tries setting the address", async function() {
            assert.equal(await instance.getOracleFactoryAddress(0), 0, "Oracle address should be unset");

            try {
                await instance.setOracleFactoryAddress(accounts[1], oracleAddress1, { from: accounts[1] });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }

            assert.equal(await instance.getOracleFactoryAddress(0), 0, "Oracle address should still be unset");
        });

        it("throws if trying to set an invalid address", async function() {
            assert.equal(await instance.getOracleFactoryAddress(0), 0, "Oracle address should be unset");

            try {
                await instance.setOracleFactoryAddress(owner, 0, { from: owner });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });
});
