const AddressManager = artifacts.require("./storage/AddressManager.sol");
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
    const oracleFactoryCreator = accounts[0];
    const oracleCreator = accounts[1];

    const testParams = {
        _eventName: ["Who will be the next president i", "n the 2020 election?"],
        _eventResultNames: ['first', 'second', 'third'],
        _eventBettingEndBlock: 100,
        _decisionEndBlock: 120,
        _arbitrationOptionEndBlock: 140
    };
    const baseReward = Utils.getBigNumberWithDecimals(10, nativeDecimals);
    const validVotingBlock = testParams._eventBettingEndBlock;

    let addressManager;
    let oracleFactory;
    let oracle;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        addressManager = await AddressManager.deployed({ from: oracleFactoryCreator });
        oracleFactory = await OracleFactory.deployed(addressManager.contract.address, { from: oracleFactoryCreator });

        let transaction = await oracleFactory.createOracle(...Object.values(testParams), 
            { from: oracleCreator, value: baseReward });
        oracle = await Oracle.at(transaction.logs[0].args._oracleAddress);
    });

    describe('constructor', async function() {
        it('should store the OracleFactory address in AddressManager', async function() {
            let index = await addressManager.getLastOracleFactoryIndex();
            assert.equal(await addressManager.getOracleFactoryAddress(index), oracleFactory.address, 
                'OracleFactory address does not match');
        });

        it('throws if the AddressManager address is invalid', async function() {
            try {
                await OracleFactory.deployed(0, { from: oracleFactoryCreator });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe('createOracle', async function() {
        it('initializes all the values of the new Oracle', async function() {
            assert.equal(await oracle.owner.call(), oracleCreator, 'owner does not match');
            assert.equal(await oracle.eventName.call(), testParams._eventName.join(''), 'eventName does not match');
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

            var oracleExists = await oracleFactory.doesOracleExist(['oracle 2'], ['first', 'second', 'third'], 100, 120, 
                140);
            assert.isFalse(oracleExists, 'Oracle 2 should not exist');
        });
    });
});
