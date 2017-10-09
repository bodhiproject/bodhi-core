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
    const participant1 = accounts[2];
    const participant2 = accounts[3];
    const participant3 = accounts[4];

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

        it("allows voting if the decisionEndBlock has not been reached", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await ethAsync.getBlockNumberAsync();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            assert.equal(await oracle.getStakeContributed({ from: participant1 }), 0, 
                "participant1 should have 0 stakeContributed");
            assert.isFalse(await oracle.didSetResult({ from: participant1 }), 
                "participant1 should not have set result");
            assert.equal(await oracle.totalStakeContributed.call(), 0, "totalStakeContributed should be 0");

            let votedResultIndex = 2;
            let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
            await oracle.voteResult(votedResultIndex, { from: participant1, value: stakeContributed });

            let actualStakeContributed = await oracle.getStakeContributed({ from: participant1 });
            assert.equal(actualStakeContributed.toString(), stakeContributed.toString(), 
                "participant1 stakeContributed does not match");
            assert.isTrue(await oracle.didSetResult({ from: participant1 }), "participant1 should have set result");
            assert.equal(await oracle.getVotedResultIndex({ from: participant1 }), votedResultIndex,
                "participant1 voted resultIndex does not match");
        });
    });
});
