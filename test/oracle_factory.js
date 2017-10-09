const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const Oracle = artifacts.require('./oracles/Oracle.sol');
const BlockHeightManager = require('./helpers/block_height_manager');
const Utils = require('./helpers/utils');
const assert = require('chai').assert;
const web3 = global.web3;

contract('OracleFactory', function(accounts) {
    // These should match the decimals in the Oracle contract.
    const nativeDecimals = 18;
    const botDecimals = 8;

    const blockHeightManager = new BlockHeightManager(web3);
    const testParams = {
        _eventName: 'Test Oracle',
        _eventResultNames: ['first', 'second', 'third'],
        _eventBettingEndBlock: 100,
        _decisionEndBlock: 120,
        _arbitrationOptionEndBlock: 140
    };
    const baseReward = Utils.getBigNumberWithDecimals(10, nativeDecimals);

    let oracleFactory;
    let oracleFactoryCreator = accounts[0];
    let oracle;
    let oracleCreator = accounts[1];

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        oracleFactory = await OracleFactory.deployed({ from: oracleFactoryCreator });
        let transaction = await oracleFactory.createOracle(...Object.values(testParams), 
            { from: oracleCreator, value: baseReward});
        oracle = await Oracle.at(Utils.getParamFromTransaction(transaction, '_oracle'));
    });

    describe('createOracle', async function() {
        it('initializes all the values of the new Oracle', async function() {
            assert.equal(await oracle.owner.call(), oracleCreator, 'owner does not match');
            assert.equal(web3.toUtf8(await oracle.eventName.call()), testParams._eventBettingEndBlock, 
                'eventName does not match');
            // assert.equal(web3.toUtf8(await topic.getResultName(0)), testTopicParams._resultNames[0], 
            //     'Result name 1 does not match.');
            // assert.equal(web3.toUtf8(await topic.getResultName(1)), testTopicParams._resultNames[1],
            //     'Result name 2 does not match.');
            // assert.equal(web3.toUtf8(await topic.getResultName(2)), testTopicParams._resultNames[2],
            //     'Result name 3 does not match.');
            assert.equal(await oracle.eventBettingEndBlock.call(), testParams._eventBettingEndBlock,
                'eventBettingEndBlock does not match');
        });

        it('does not allow recreating the same Oracle twice', async function() {
            let oracleExists = await oracleFactory.doesOracleExist(...Object.values(testParams));
            assert.isTrue(oracleExists, 'Oracle should already exist');

            try {
                await oracleFactory.createOracle(...Object.values(testParams), 
                    { from: oracleCreator, value: baseReward});
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });
});
