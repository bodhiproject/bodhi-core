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
    const baseReward = 10e18;

    let oracle;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        oracle = await Oracle.new(...Object.values(testOracleParams), { from: accounts[0], value: 10e18 });
    });

    describe("New Oracle", async function() {
        it("inits the Oracle with the correct values", async function() {
            assert.equal(web3.toUtf8(await oracle.eventName.call()), testOracleParams._eventName, 
                "eventName does not match.");
            assert.equal(web3.toUtf8(await oracle.eventResultNames.call(0)), testOracleParams._eventResultNames[0], 
                "eventResultName 1 does not match.");
            assert.equal(web3.toUtf8(await oracle.eventResultNames.call(1)), testOracleParams._eventResultNames[1], 
                "eventResultName 2 does not match.");
            assert.equal(web3.toUtf8(await oracle.eventResultNames.call(2)), testOracleParams._eventResultNames[2], 
                "eventResultName 3 does not match.");
            assert.equal(await oracle.eventBettingEndBlock.call(), testOracleParams._eventBettingEndBlock, 
                "eventBettingEndBlock does not match.");
            assert.equal(await oracle.decisionEndBlock.call(), testOracleParams._decisionEndBlock, 
                "decisionEndBlock does not match.");

            let arbitrationBlocks = testOracleParams._arbitrationOptionMinutes / testOracleParams._averageBlockTime;
            let expectedArbitrationOptionEndBlock = testOracleParams._decisionEndBlock + arbitrationBlocks;
            assert.equal(await oracle.arbitrationOptionEndBlock.call(), expectedArbitrationOptionEndBlock, 
                "arbitrationEndBlock does not match.");
        });
    });
});
