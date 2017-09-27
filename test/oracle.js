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
        oracle = await Oracle.new(...Object.values(testOracleParams), 
            { from: accounts[0], value: 10e18 });
    });

    describe("New Oracle", async function() {
        it("inits the Oracle with the correct values", async function() {
            assert.equal(web3.toUtf8(await oracle.eventName.call()), testOracleParams._eventName, 
                "Event name does not match.");
        });
    });
});
