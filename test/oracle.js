const web3 = global.web3;
const Oracle = artifacts.require("./Oracle.sol");
const assert = require('chai').assert;
const bluebird = require('bluebird');
const BlockHeightManager = require('./helpers/block_height_manager');
const Utils = require('./helpers/utils');

contract('Oracle', function(accounts) {
    // These should match the decimals in the contract.
    const nativeDecimals = 18;
    const botDecimals = 8;

    const blockHeightManager = new BlockHeightManager(web3);
    const testOracleParams = {
        _eventName: "test",
        _eventResultNames: ["first", "second", "third"],
        _eventBettingEndBlock: 100,
        _decisionEndBlock: 120,
        _arbitrationOptionEndBlock: 140
    };
    const baseReward = Utils.getBigNumberWithDecimals(10, nativeDecimals);
    const validVotingBlock = testOracleParams._eventBettingEndBlock;
    const oracleCreator = accounts[0];
    const participant1 = accounts[1];
    const participant2 = accounts[2];
    const participant3 = accounts[3];
    const participant4 = accounts[4];
    const participant5 = accounts[5];
    const participant6 = accounts[6];

    let oracle;
    let getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        oracle = await Oracle.new(...Object.values(testOracleParams), { from: oracleCreator });
        await oracle.addBaseReward({ from: oracleCreator, value: baseReward });
    });

    describe("New Oracle", async function() {
        it.only("inits the Oracle with the correct values", async function() {
            assert.equal(web3.toUtf8(await oracle.eventName.call()), testOracleParams._eventName, 
                "eventName does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(0)), testOracleParams._eventResultNames[0], 
                "eventResultName 1 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(1)), testOracleParams._eventResultNames[1], 
                "eventResultName 2 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(2)), testOracleParams._eventResultNames[2], 
                "eventResultName 3 does not match");
            assert.equal(await oracle.eventBettingEndBlock.call(), testOracleParams._eventBettingEndBlock, 
                "eventBettingEndBlock does not match");
            assert.equal(await oracle.decisionEndBlock.call(), testOracleParams._decisionEndBlock, 
                "decisionEndBlock does not match");
            assert.equal(await oracle.arbitrationOptionEndBlock.call(), testOracleParams._arbitrationOptionEndBlock, 
                "arbitrationEndBlock does not match");
        });

        it("can handle a long eventName", async function() {
            let params = {
                _eventName: "This is a super long event name that is longer than 32 bytes. It should still work.",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _arbitrationOptionEndBlock: 140
            };

            let o = await Oracle.new(...Object.values(params), { from: oracleCreator });
            assert.equal(web3.toUtf8(await o.eventName.call()), params._eventName);
        });

        it("throws if the eventName is empty", async function() {
            let params = {
                _eventName: "",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _arbitrationOptionEndBlock: 140
            };
            assert.equal(0, params._eventName.length, "eventName.length should be 0");

            try {
                await Oracle.new(...Object.values(params), { from: oracleCreator });
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
                _arbitrationOptionEndBlock: 140
            };

            try {
                await Oracle.new(...Object.values(params), { from: oracleCreator });
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
                _arbitrationOptionEndBlock: 140
            };

            try {
                await Oracle.new(...Object.values(params), { from: oracleCreator });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if the arbitrationOptionEndBlock is not greater than decisionEndBlock", async function() {
            let params = {
                _eventName: "test",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _arbitrationOptionEndBlock: 110
            };

            try {
                await Oracle.new(...Object.values(params), { from: oracleCreator });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("addBaseReward", async function() {
        it("throws if the baseReward is not enough", async function() {
            let invalidMinBaseReward = web3.toBigNumber(10e16);
            assert.isBelow(invalidMinBaseReward.toNumber(), 
                web3.toBigNumber(await oracle.minBaseReward.call()).toNumber(), 
                "Invalid minBaseReward should be below minBaseReward");

            let o = await Oracle.new(...Object.values(params), { from: oracleCreator });

            try {
                o.addBaseReward({ from: oracleCreator, value: invalidMinBaseReward });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("voteResult", async function() {
        it("allows voting", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = web3.eth.blockNumber;
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

        it("throws if the eventResultIndex is invalid", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = web3.eth.blockNumber;
            assert(blockNumber >= testOracleParams._eventBettingEndBlock, 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            try {
                let votedResultIndex = 3;
                let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
                await oracle.voteResult(votedResultIndex, { from: participant1, value: stakeContributed });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if the value is 0", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = web3.eth.blockNumber;
            assert(blockNumber >= testOracleParams._eventBettingEndBlock, 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            try {
                let votedResultIndex = 0;
                await oracle.voteResult(votedResultIndex, { from: participant1 });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if trying to vote before the eventBettingEndBlock", async function() {
            assert.isBelow(web3.eth.blockNumber, (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be below eventBettingEndBlock");

            try {
                let votedResultIndex = 1;
                let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
                await oracle.voteResult(votedResultIndex, { from: participant1, value: stakeContributed });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if trying to vote after the decisionEndBlock", async function() {
            await blockHeightManager.mineTo(testOracleParams._decisionEndBlock);
            assert(web3.eth.blockNumber >= (await oracle.decisionEndBlock.call()).toNumber(),
                "Block should be greater than or equal to decisionEndBlock");

            try {
                let votedResultIndex = 1;
                let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
                await oracle.voteResult(votedResultIndex, { from: participant1, value: stakeContributed });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if trying to vote again", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = web3.eth.blockNumber;
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            assert.isFalse(await oracle.didSetResult({ from: participant1 }), 
                "participant1 should not have set result");

            let votedResultIndex = 2;
            let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
            await oracle.voteResult(votedResultIndex, { from: participant1, value: stakeContributed });

            assert.isTrue(await oracle.didSetResult({ from: participant1 }), "participant1 should have set result");
            assert.equal(await oracle.getVotedResultIndex({ from: participant1 }), votedResultIndex,
                "participant1 voted resultIndex does not match");

            try {
                await oracle.voteResult(votedResultIndex, { from: participant1, value: stakeContributed });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("withdrawEarnings", async function() {
        let winningStake1 = Utils.getBigNumberWithDecimals(3, botDecimals);
        let winningStake2 = Utils.getBigNumberWithDecimals(5, botDecimals);
        let winningStake3 = Utils.getBigNumberWithDecimals(7, botDecimals);
        let losingStake1 = Utils.getBigNumberWithDecimals(6, botDecimals);
        let losingStake2 = Utils.getBigNumberWithDecimals(2, botDecimals);

        beforeEach(async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await getBlockNumber();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            await oracle.voteResult(0, { from: participant1, value: winningStake1 });            
            await oracle.voteResult(0, { from: participant2, value: winningStake2 });
            await oracle.voteResult(0, { from: participant3, value: winningStake3 });
            await oracle.voteResult(1, { from: participant4, value: losingStake1 });
            await oracle.voteResult(2, { from: participant5, value: losingStake2 });
        });

        it("allows withdrawing if they picked the winning result", async function() {
            assert.isTrue(await oracle.didSetResult({ from: participant1 }), "participant1 should have set result");
            assert.equal(await oracle.getVotedResultIndex({ from: participant1 }), 0,
                "participant1 voted resultIndex does not match");
            assert.equal((await oracle.getStakeContributed({ from: participant1 })).toString(), 
                winningStake1.toString(), "participant1 stakeContributed does not match");

            let arbitrationOptionEndBlock = (await oracle.arbitrationOptionEndBlock.call()).toNumber();
            await blockHeightManager.mineTo(arbitrationOptionEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationOptionEndBlock, 
                "Block should be at least arbitrationOptionEndBlock");

            var actualEarningsAmount = await oracle.getEarningsAmount({ from: participant1 });
            let winningStakes = winningStake1.add(winningStake2).add(winningStake3);
            let losingStakes = losingStake1.add(losingStake2);
            let expectedEarningsAmount = winningStake1.mul(losingStakes).div(winningStakes).add(winningStake1);
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "earningsAmount does not match");
            await oracle.withdrawEarnings({ from: participant1 });

            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant1 });
            assert.equal(actualEarningsAmount, 0, "earningsAmount should be 0");
        });

        it("throws if trying to withdraw twice", async function() {
            assert.isTrue(await oracle.didSetResult({ from: participant1 }), "participant1 should have set result");
            assert.equal(await oracle.getVotedResultIndex({ from: participant1 }), 0,
                "participant1 voted resultIndex does not match");
            assert.equal((await oracle.getStakeContributed({ from: participant1 })).toString(), 
                winningStake1.toString(), "participant1 stakeContributed does not match");

            let arbitrationOptionEndBlock = (await oracle.arbitrationOptionEndBlock.call()).toNumber();
            await blockHeightManager.mineTo(arbitrationOptionEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationOptionEndBlock, 
                "Block should be at least arbitrationOptionEndBlock");

            var actualEarningsAmount = await oracle.getEarningsAmount({ from: participant1 });
            let winningStakes = winningStake1.add(winningStake2).add(winningStake3);
            let losingStakes = losingStake1.add(losingStake2);
            let expectedEarningsAmount = winningStake1.mul(losingStakes).div(winningStakes).add(winningStake1);
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "earningsAmount does not match");
            await oracle.withdrawEarnings({ from: participant1 });

            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant1 });
            assert.equal(actualEarningsAmount, 0, "earningsAmount should be 0");

            try {
                await oracle.withdrawEarnings({ from: participant1 });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if trying to withdraw before arbitrationOptionEndBlock", async function() {
            assert.isBelow(await getBlockNumber(), (await oracle.arbitrationOptionEndBlock.call()).toNumber(), 
                "Block should be below arbitrationOptionEndBlock");

            try {
                await oracle.withdrawEarnings({ from: participant1 });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it("throws if trying to withdraw if stakeContributed is 0", async function() {
            let arbitrationOptionEndBlock = (await oracle.arbitrationOptionEndBlock.call()).toNumber();
            await blockHeightManager.mineTo(arbitrationOptionEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationOptionEndBlock, 
                "Block should be at least arbitrationOptionEndBlock");

            try {
                await oracle.withdrawEarnings({ from: participant6 });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("getEventResultName", async function() {
        it("returns the correct result name", async function() {
            assert.equal(web3.toUtf8(await oracle.getEventResultName(0)), testOracleParams._eventResultNames[0], 
                "eventResultName 1 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(1)), testOracleParams._eventResultNames[1], 
                "eventResultName 2 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(2)), testOracleParams._eventResultNames[2], 
                "eventResultName 3 does not match");
        });

        it("throws if using an invalid result index", async function() {
            try {
                await oracle.getEventResultName(3);
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("getArbitrationOptionBlocks", async function() {
        it("returns the correct number of blocks", async function() {
            var averageBlockTime = 10;
            var arbitrationOptionMinutes = 100;
            assert.equal(await oracle.getArbitrationOptionBlocks(averageBlockTime, arbitrationOptionMinutes), 
                Math.trunc(arbitrationOptionMinutes / averageBlockTime));

            averageBlockTime = 7;
            arbitrationOptionMinutes = 12345;
            assert.equal(await oracle.getArbitrationOptionBlocks(averageBlockTime, arbitrationOptionMinutes), 
                Math.trunc(arbitrationOptionMinutes / averageBlockTime));

            averageBlockTime = 13;
            arbitrationOptionMinutes = 42176;
            assert.equal(await oracle.getArbitrationOptionBlocks(averageBlockTime, arbitrationOptionMinutes), 
                Math.trunc(arbitrationOptionMinutes / averageBlockTime));

            averageBlockTime = 3;
            arbitrationOptionMinutes = 1;
            assert.equal(await oracle.getArbitrationOptionBlocks(averageBlockTime, arbitrationOptionMinutes), 
                Math.trunc(arbitrationOptionMinutes / averageBlockTime));

            averageBlockTime = 5;
            arbitrationOptionMinutes = 0;
            assert.equal(await oracle.getArbitrationOptionBlocks(averageBlockTime, arbitrationOptionMinutes), 
                Math.trunc(arbitrationOptionMinutes / averageBlockTime));
        });

        it("throws if averageBlockTime is 0", async function() {
            try {
                await oracle.getArbitrationOptionBlocks(0, 100);
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("getStakeContributed", async function() {
        it("returns the correct stake contributed", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await getBlockNumber();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
            await oracle.voteResult(0, { from: participant1, value: stakeContributed });

            let actualStakeContributed = await oracle.getStakeContributed({ from: participant1 });
            assert.equal(actualStakeContributed.toString(), stakeContributed.toString(), 
                "stakeContributed does not match");
        });
    });

    describe("didSetResult", async function() {
        it("returns correctly", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await getBlockNumber();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            assert.isFalse(await oracle.didSetResult({ from: participant1 }), 
                "participant1 should not have set result");

            let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
            await oracle.voteResult(0, { from: participant1, value: stakeContributed });

            assert.isTrue(await oracle.didSetResult({ from: participant1 }), 
                "participant1 should have set result");
        });
    });

    describe("getVotedResultIndex", async function() {
        it("returns the correct voted index", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await getBlockNumber();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            assert.isFalse(await oracle.didSetResult({ from: participant1 }), 
                "participant1 should not have set result");

            let votedResultIndex = 1;
            let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
            await oracle.voteResult(votedResultIndex, { from: participant1, value: stakeContributed });

            assert.isTrue(await oracle.didSetResult({ from: participant1 }), 
                "participant1 should have set result");
            assert.equal(await oracle.getVotedResultIndex({ from: participant1 }), votedResultIndex,
                "participant1 votedResultIndex does not match");
        });

        it("throws if trying to get the voted index and did not vote", async function() {
            assert.isFalse(await oracle.didSetResult({ from: participant1 }), 
                "participant1 should not have set result");

            try {
                await oracle.getVotedResultIndex({ from: participant1 });
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("getFinalResultIndex", async function() {
        it("returns the correct final result index", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await getBlockNumber();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            let decisionEndBlock = (await oracle.arbitrationOptionEndBlock.call()).toNumber();
            assert.isBelow(blockNumber, decisionEndBlock, "Block should be below decisionEndBlock");

            await oracle.voteResult(0, { from: participant1, value: Utils.getBigNumberWithDecimals(3, botDecimals) });            
            await oracle.voteResult(1, { from: participant2, value: Utils.getBigNumberWithDecimals(4, botDecimals) });
            await oracle.voteResult(1, { from: participant3, value: Utils.getBigNumberWithDecimals(5, botDecimals) });
            await oracle.voteResult(2, { from: participant4, value: Utils.getBigNumberWithDecimals(10, botDecimals) });
            await oracle.voteResult(2, { from: participant5, value: Utils.getBigNumberWithDecimals(1, botDecimals) });
            
            await blockHeightManager.mineTo(decisionEndBlock);
            assert.isAtLeast(await getBlockNumber(), decisionEndBlock, "Block should be at least decisionEndBlock");

            assert.equal(await oracle.getFinalResultIndex(), 2, "finalResultIndex does not match");
        });

        it("throws if trying to get the final result index before the decisionEndBlock", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await getBlockNumber();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            let decisionEndBlock = (await oracle.arbitrationOptionEndBlock.call()).toNumber();
            assert.isBelow(blockNumber, decisionEndBlock, "Block should be below decisionEndBlock");

            try {
                await oracle.getFinalResultIndex();
                assert.fail();
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });
    });

    describe("getEarningsAmount", async function() {
        let winningStake1 = Utils.getBigNumberWithDecimals(11, botDecimals);
        let winningStake2 = Utils.getBigNumberWithDecimals(13, botDecimals);
        let winningStake3 = Utils.getBigNumberWithDecimals(5, botDecimals);
        let losingStake1 = Utils.getBigNumberWithDecimals(7, botDecimals);
        let losingStake2 = Utils.getBigNumberWithDecimals(3, botDecimals);
        let losingStake3 = Utils.getBigNumberWithDecimals(8, botDecimals);

        beforeEach(async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = await getBlockNumber();
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be at or after eventBettingEndBlock");
            let decisionEndBlock = (await oracle.decisionEndBlock.call()).toNumber();
            assert.isBelow(blockNumber, decisionEndBlock, "Block should be below decisionEndBlock");

            await oracle.voteResult(1, { from: participant1, value: winningStake1 });            
            await oracle.voteResult(1, { from: participant2, value: winningStake2 });
            await oracle.voteResult(1, { from: participant3, value: winningStake3 });
            await oracle.voteResult(0, { from: participant4, value: losingStake1 });
            await oracle.voteResult(2, { from: participant5, value: losingStake2 });
            await oracle.voteResult(0, { from: participant6, value: losingStake3 });

            await blockHeightManager.mineTo(decisionEndBlock);
            assert.isAtLeast(await getBlockNumber(), decisionEndBlock, "Block should be at least decisionEndBlock");
        });

        it("returns the correct earnings amount", async function() {
            let winningStakes = winningStake1.add(winningStake2).add(winningStake3);
            let losingStakes = losingStake1.add(losingStake2).add(losingStake3);

            // Participant 1
            var actualEarningsAmount = await oracle.getEarningsAmount({ from: participant1 });
            var expectedEarningsAmount = Math.floor(winningStake1.mul(losingStakes).div(winningStakes).add(winningStake1));
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant1 earningsAmount does not match");

            // Participant 2
            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant2 });
            expectedEarningsAmount = Math.floor(winningStake2.mul(losingStakes).div(winningStakes).add(winningStake2));
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant2 earningsAmount does not match");

            // Participant 3
            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant3 });
            expectedEarningsAmount = Math.floor(winningStake3.mul(losingStakes).div(winningStakes).add(winningStake3));
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant3 earningsAmount does not match");

            // Participant 4
            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant4 });
            expectedEarningsAmount = 0;
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant4 earningsAmount does not match");

            // Participant 5
            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant5 });
            expectedEarningsAmount = 0;
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant5 earningsAmount does not match");

            // Participant 6
            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant6 });
            expectedEarningsAmount = 0;
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant6 earningsAmount does not match");
        });

        it("returns 0 if the user's stakeContributed is 0", async function() {
            assert.equal(await oracle.getEarningsAmount({ from: accounts[7] }), 0, 
                "getEarningsAmount should be returning 0");
        });

        it("returns 0 if the user did not set a result", async function() {
            assert.equal(await oracle.getEarningsAmount({ from: accounts[7] }), 0, 
                "getEarningsAmount should be returning 0");
        });

        it("returns 0 if the user already withdrew their earnings", async function() {
            let arbitrationOptionEndBlock = (await oracle.arbitrationOptionEndBlock.call()).toNumber();
            await blockHeightManager.mineTo(arbitrationOptionEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationOptionEndBlock, 
                "Block should be at least arbitrationOptionEndBlock");

            let winningStakes = winningStake1.add(winningStake2).add(winningStake3);
            let losingStakes = losingStake1.add(losingStake2).add(losingStake3);

            var actualEarningsAmount = await oracle.getEarningsAmount({ from: participant1 });
            var expectedEarningsAmount = Math.floor(winningStake1.mul(losingStakes).div(winningStakes).add(winningStake1));
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant1 earningsAmount does not match");

            await oracle.withdrawEarnings({ from: participant1 });

            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant1 });
            assert.equal(actualEarningsAmount, 0, "earningsAmount should be 0 after withdrawing already");
        });

        it("returns 0 if the user set a losing result", async function() {
            var actualEarningsAmount = await oracle.getEarningsAmount({ from: participant4 });
            let expectedEarningsAmount = 0;
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant4 earningsAmount does not match");

            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant5 });
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant5 earningsAmount does not match");

            actualEarningsAmount = await oracle.getEarningsAmount({ from: participant6 });
            assert.equal(actualEarningsAmount.toString(), expectedEarningsAmount.toString(), 
                "participant6 earningsAmount does not match");
        });
    });
});
