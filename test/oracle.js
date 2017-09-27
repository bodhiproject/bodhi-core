const web3 = global.web3;
const Oracle = artifacts.require("./Oracle.sol");
const assert = require('chai').assert;
const BlockHeightManager = require('./helpers/block_height_manager');

contract('Oracle', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const testOracleParams = {
        _eventName: "test",
        _eventResultNames: ["first", "second", "third"],
        _eventBettingEndBlock: 100,
        _decisionEndBlock: 120,
        _averageBlockTime: 10,
        _arbitrationOptionMinutes: 1440
    };
    const baseReward = web3.toBigNumber(10e18);

    let oracle;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        oracle = await Oracle.new(...Object.values(testOracleParams), { from: accounts[0], value: baseReward });
    });

    describe("New Oracle", async function() {
        it("inits the Oracle with the correct values", async function() {
            assert.equal(web3.toUtf8(await oracle.eventName.call()), testOracleParams._eventName, 
                "eventName does not match");
            assert.equal(web3.toUtf8(await oracle.eventResultNames.call(0)), testOracleParams._eventResultNames[0], 
                "eventResultName 1 does not match");
            assert.equal(web3.toUtf8(await oracle.eventResultNames.call(1)), testOracleParams._eventResultNames[1], 
                "eventResultName 2 does not match");
            assert.equal(web3.toUtf8(await oracle.eventResultNames.call(2)), testOracleParams._eventResultNames[2], 
                "eventResultName 3 does not match");
            assert.equal(await oracle.eventBettingEndBlock.call(), testOracleParams._eventBettingEndBlock, 
                "eventBettingEndBlock does not match");
            assert.equal(await oracle.decisionEndBlock.call(), testOracleParams._decisionEndBlock, 
                "decisionEndBlock does not match");

            let arbitrationBlocks = testOracleParams._arbitrationOptionMinutes / testOracleParams._averageBlockTime;
            let expectedArbitrationOptionEndBlock = testOracleParams._decisionEndBlock + arbitrationBlocks;
            assert.equal(await oracle.arbitrationOptionEndBlock.call(), expectedArbitrationOptionEndBlock, 
                "arbitrationEndBlock does not match");
        });

        it("can handle a long eventName", async function() {
            let params = {
                _eventName: "This is a super long event name that is longer than 32 bytes. It should still work.",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _averageBlockTime: 10,
                _arbitrationOptionMinutes: 1440
            };

            let o = await Oracle.new(...Object.values(params), { from: accounts[0], value: baseReward });
            assert.equal(web3.toUtf8(await o.eventName.call()), params._eventName);
        });

        it("throws if the baseReward is not enough", async function() {
            let invalidMinBaseReward = web3.toBigNumber(10e16);
            assert.isBelow(invalidMinBaseReward.toNumber(), 
                web3.toBigNumber(await oracle.minBaseReward.call()).toNumber(), 
                "Invalid minBaseReward should be below minBaseReward");

            try {
                await Oracle.new(...Object.values(testOracleParams), { from: accounts[1], value: invalidMinBaseReward });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if the eventName is empty", async function() {
            let params = {
                _eventName: "",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _averageBlockTime: 10,
                _arbitrationOptionMinutes: 1440
            };
            assert.equal(0, params._eventName.length, "eventName.length should be 0");

            try {
                await Oracle.new(...Object.values(params), { from: accounts[0], value: baseReward });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if the eventResultNames array is not greater than 1", async function() {
            let params = {
                _eventName: "test",
                _eventResultNames: ["first"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _averageBlockTime: 10,
                _arbitrationOptionMinutes: 1440
            };

            try {
                await Oracle.new(...Object.values(params), { from: accounts[0], value: baseReward });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if the decisionEndBlock is not greater than eventBettingEndBlock", async function() {
            let params = {
                _eventName: "test",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 99,
                _averageBlockTime: 10,
                _arbitrationOptionMinutes: 1440
            };

            try {
                await Oracle.new(...Object.values(params), { from: accounts[0], value: baseReward });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if the averageBlockTime is not greater than 0", async function() {
            let params = {
                _eventName: "test",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _averageBlockTime: 0,
                _arbitrationOptionMinutes: 1440
            };

            try {
                await Oracle.new(...Object.values(params), { from: accounts[0], value: baseReward });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if the _arbitrationOptionMinutes is not greater than 0", async function() {
            let params = {
                _eventName: "test",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _averageBlockTime: 10,
                _arbitrationOptionMinutes: 0
            };

            try {
                await Oracle.new(...Object.values(params), { from: accounts[0], value: baseReward });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });
});
