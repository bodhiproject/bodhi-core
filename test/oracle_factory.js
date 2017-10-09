const OracleFactory = artifacts.require('./oracles/OracleFactory.sol');
const Oracle = artifacts.require('./oracles/Oracle.sol');
const BlockHeightManager = require('./helpers/block_height_manager');
const Utils = require('./helpers/utils');
const bluebird = require('bluebird');
const assert = require('chai').assert;
const web3 = global.web3;
const ethAsync = bluebird.promisifyAll(web3.eth);

contract('OracleFactory', function(accounts) {
    // These should match the decimals in the Oracle contract.
    const nativeDecimals = 18;
    const botDecimals = 8;

    const blockHeightManager = new BlockHeightManager(web3);
    const oracleFactoryCreator = accounts[0];
    const oracleCreator = accounts[1];

    const testParams = {
        _eventName: 'Test Oracle',
        _eventResultNames: ['first', 'second', 'third'],
        _eventBettingEndBlock: 100,
        _decisionEndBlock: 120,
        _arbitrationOptionEndBlock: 140
    };
    const baseReward = Utils.getBigNumberWithDecimals(10, nativeDecimals);
    const validVotingBlock = testParams._eventBettingEndBlock;

    let oracleFactory;
    let oracle;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        oracleFactory = await OracleFactory.deployed({ from: oracleFactoryCreator });
        let transaction = await oracleFactory.createOracle(...Object.values(testParams), 
            { from: oracleCreator, value: baseReward });
        oracle = await Oracle.at(Utils.getParamFromTransaction(transaction, '_oracle'));
    });

    describe('createOracle', async function() {
        it('initializes all the values of the new Oracle', async function() {
            assert.equal(await oracle.owner.call(), oracleCreator, 'owner does not match');
            assert.equal(web3.toUtf8(await oracle.eventName.call()), testParams._eventName, 
                'eventName does not match');
            assert.equal(web3.toUtf8(await oracle.getEventResultName(0)), testParams._eventResultNames[0], 
                'eventResultName 0 does not match.');
            assert.equal(web3.toUtf8(await oracle.getEventResultName(1)), testParams._eventResultNames[1], 
                'eventResultName 1 does not match.');
            assert.equal(web3.toUtf8(await oracle.getEventResultName(2)), testParams._eventResultNames[2], 
                'eventResultName 2 does not match.');
            assert.equal(await oracle.eventBettingEndBlock.call(), testParams._eventBettingEndBlock,
                'eventBettingEndBlock does not match');
            assert.equal(await oracle.decisionEndBlock.call(), testParams._decisionEndBlock,
                'decisionEndBlock does not match');
            assert.equal(await oracle.arbitrationOptionEndBlock.call(), testParams._arbitrationOptionEndBlock,
                'arbitrationOptionEndBlock does not match');
        });

        it('sets the baseReward', async function() {
            let balance = await web3.eth.getBalance(oracle.address);
            assert.equal(balance.toString(), baseReward.toString(), 'baseReward does not match');
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

    describe('doesOracleExist', async function() {
        it('returns true if the Oracle exists', async function() {
            var oracleExists = await oracleFactory.doesOracleExist(...Object.values(testParams));
            assert.isTrue(oracleExists, 'Oracle 1 should already exist');

            var oracleExists = await oracleFactory.doesOracleExist('oracle 2', ['first', 'second', 'third'], 100, 120, 
                140);
            assert.isFalse(oracleExists, 'Oracle 2 should not exist');
        });
    });
});
