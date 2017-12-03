const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');
const BodhiToken = artifacts.require("./tokens/BodhiToken.sol");
const AddressManager = artifacts.require("./storage/AddressManager.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const DecentralizedOracle = artifacts.require("./oracles/DecentralizedOracle.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const Utils = require('../helpers/utils');
const assertInvalidOpcode = require('../helpers/assert_invalid_opcode');
const ethAsync = bluebird.promisifyAll(web3.eth);

contract('DecentralizedOracle', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);

    // These should match the decimals in the contract.
    const nativeDecimals = 8;
    const botDecimals = 8;

    const admin = accounts[0];
    const centralizedOracle = accounts[1];
    const participant1 = accounts[2];
    const participant2 = accounts[3];
    const participant3 = accounts[4];
    const participant4 = accounts[5];
    const participant5 = accounts[6];
    const participant6 = accounts[7];
    const botBalance = Utils.getBigNumberWithDecimals(20, botDecimals);

    const topicEventParams = {
        _owner: admin,
        _oracle: centralizedOracle,
        _name: ["Who will be the next president i", "n the 2020 election?"],
        _resultNames: ["first", "second", "third"],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110
    };
    const testOracleParams = {
        _owner: admin,
        _eventName: ["Who will be the next president i", "n the 2020 election?"],
        _eventResultNames: ["first", "second", "third"],
        _numOfResults: 3,
        _lastResultIndex: 2,
        _arbitrationEndBlock: 120,
        _consensusThreshold: Utils.getBigNumberWithDecimals(110, botDecimals)
    };
    const validVotingBlock = testOracleParams._eventBettingEndBlock;

    let topicEvent;
    let oracle;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        topicEvent = await TopicEvent.new(...Object.values(topicEventParams), addressManager.address, { from: admin });
        oracle = await DecentralizedOracle.new(...Object.values(testOracleParams), addressManager.address, 
            { from: admin });
    });

    describe("constructor", async function() {
        it("inits the DecentralizedOracle with the correct values", async function() {
            assert.equal(await oracle.owner.call(), testOracleParams._owner, "owner does not match");
            assert.equal(await oracle.getEventName(), testOracleParams._eventName.join(''), "eventName does not match");
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

        it('can handle a long name using all 10 array slots', async function() {
            let name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef'];

            oracle = await DecentralizedOracle.new(testOracleParams._owner, name, testOracleParams._eventResultNames,
                testOracleParams._eventBettingEndBlock, testOracleParams._decisionEndBlock, 
                testOracleParams._arbitrationOptionEndBlock, addressManager.address, { from: admin });

            assert.equal(await oracle.getEventName(), name.join(''), 'eventName does not match');
        });

        it('should only concatenate first 10 array slots of the name array', async function() {
            let name = ['abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef', 'abcdefghijklmnopqrstuvwxyzabcdef',
                'abcdefghijklmnopqrstuvwxyzabcdef'];

            oracle = await DecentralizedOracle.new(testOracleParams._owner, name, testOracleParams._eventResultNames,
                testOracleParams._eventBettingEndBlock, testOracleParams._decisionEndBlock, 
                testOracleParams._arbitrationOptionEndBlock, addressManager.address, { from: admin });

            let expected = 'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef' +
                'abcdefghijklmnopqrstuvwxyzabcdefabcdefghijklmnopqrstuvwxyzabcdef';
            assert.equal(await oracle.getEventName(), expected, 'eventName does not match');
        });

        it('should allow a space as the last character of a name array item', async function() {
            let array = ['abcdefghijklmnopqrstuvwxyzabcde ', 'fghijklmnopqrstuvwxyz'];
            let expected = 'abcdefghijklmnopqrstuvwxyzabcde fghijklmnopqrstuvwxyz';
            oracle = await DecentralizedOracle.new(testOracleParams._owner, array, testOracleParams._eventResultNames,
                testOracleParams._eventBettingEndBlock, testOracleParams._decisionEndBlock, 
                testOracleParams._arbitrationOptionEndBlock, addressManager.address, { from: admin });

            assert.equal(await oracle.getEventName(), expected, 'Expected string does not match');
        });

        it('should allow a space as the first character if the next character is not empty in a name array item', 
            async function() {
            let array = ['abcdefghijklmnopqrstuvwxyzabcdef', ' ghijklmnopqrstuvwxyz'];
            let expected = 'abcdefghijklmnopqrstuvwxyzabcdef ghijklmnopqrstuvwxyz';
            oracle = await DecentralizedOracle.new(testOracleParams._owner, array, testOracleParams._eventResultNames,
                testOracleParams._eventBettingEndBlock, testOracleParams._decisionEndBlock, 
                testOracleParams._arbitrationOptionEndBlock, addressManager.address, { from: admin });

            assert.equal(await oracle.getEventName(), expected, 'Expected string does not match');
        });

        it('can handle using all 10 eventResultNames', async function() {
            oracle = await DecentralizedOracle.new(testOracleParams._owner, testOracleParams._eventName, 
                ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "ten"],
                testOracleParams._eventBettingEndBlock, testOracleParams._decisionEndBlock, 
                testOracleParams._arbitrationOptionEndBlock, addressManager.address, { from: admin });

            assert.equal(web3.toUtf8(await oracle.getEventResultName(0)), "first", "eventResultName 0 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(1)), "second", "eventResultName 1 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(2)), "third", "eventResultName 2 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(3)), "fourth", "eventResultName 3 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(4)), "fifth", "eventResultName 4 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(5)), "sixth", "eventResultName 5 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(6)), "seventh", "eventResultName 6 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(7)), "eighth", "eventResultName 7 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(8)), "ninth", "eventResultName 8 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(9)), "ten", "eventResultName 9 does not match");
        });

        it('should only set the first 10 eventResultNames', async function() {
            let eventResultNames = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", 
                "ninth", "ten", "eleven"];
            oracle = await DecentralizedOracle.new(testOracleParams._owner, testOracleParams._eventName, 
                eventResultNames, testOracleParams._eventBettingEndBlock, testOracleParams._decisionEndBlock, 
                testOracleParams._arbitrationOptionEndBlock, addressManager.address, { from: admin });

            assert.equal(web3.toUtf8(await oracle.getEventResultName(0)), "first", "eventResultName 0 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(1)), "second", "eventResultName 1 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(2)), "third", "eventResultName 2 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(3)), "fourth", "eventResultName 3 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(4)), "fifth", "eventResultName 4 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(5)), "sixth", "eventResultName 5 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(6)), "seventh", "eventResultName 6 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(7)), "eighth", "eventResultName 7 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(8)), "ninth", "eventResultName 8 does not match");
            assert.equal(web3.toUtf8(await oracle.getEventResultName(9)), "ten", "eventResultName 9 does not match");

            try {
                await oracle.getEventResultName(10);
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws if the eventName is empty", async function() {
            let params = {
                _owner: admin,
                _eventName: "",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _arbitrationOptionEndBlock: 140
            };
            assert.equal(0, params._eventName.length, "eventName.length should be 0");

            try {
                await DecentralizedOracle.new(...Object.values(params), addressManager.address, { from: admin });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws if the eventResultNames array is not greater than 1", async function() {
            let params = {
                _owner: admin,
                _eventName: "test",
                _eventResultNames: ["first"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _arbitrationOptionEndBlock: 140
            };

            try {
                await DecentralizedOracle.new(...Object.values(params), addressManager.address, { from: admin });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws if the decisionEndBlock is not greater than eventBettingEndBlock", async function() {
            let params = {
                _owner: admin,
                _eventName: "test",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 99,
                _arbitrationOptionEndBlock: 140
            };

            try {
                await DecentralizedOracle.new(...Object.values(params), addressManager.address, { from: admin });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws if the arbitrationOptionEndBlock is not greater than decisionEndBlock", async function() {
            let params = {
                _owner: admin,
                _eventName: "test",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _arbitrationOptionEndBlock: 110
            };

            try {
                await DecentralizedOracle.new(...Object.values(params), addressManager.address, { from: admin });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
        
        it('throws if the AddressManager address is invalid', async function() {
            let params = {
                _owner: admin,
                _eventName: "test",
                _eventResultNames: ["first", "second", "third"],
                _eventBettingEndBlock: 100,
                _decisionEndBlock: 120,
                _arbitrationOptionEndBlock: 140,
                _addressManager: 0
            };

            try {
                await DecentralizedOracle.new(...Object.values(params), { from: admin });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("fallback function", async function() {
        it("throws upon calling", async function() {
            let o = await DecentralizedOracle.new(...Object.values(testOracleParams), addressManager.address, 
                { from: admin });
            try {
                await ethAsync.sendTransactionAsync({
                    to: o.address,
                    from: admin,
                    value: baseReward
                });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe("addBaseReward", async function() {
        it("accepts the baseReward", async function() {
            let balance = await web3.eth.getBalance(oracle.address);
            assert.equal(balance.toString(), baseReward.toString(), "baseReward does not match");
        });

        it("throws if the baseReward is not enough", async function() {
            let invalidMinBaseReward = web3.toBigNumber(10e16);
            assert.isBelow(invalidMinBaseReward.toNumber(), 
                web3.toBigNumber(await oracle.minBaseReward.call()).toNumber(), 
                "Invalid minBaseReward should be below minBaseReward");

            let o = await DecentralizedOracle.new(...Object.values(testOracleParams), addressManager.address, 
                { from: admin });

            try {
                await o.addBaseReward({ from: admin, value: invalidMinBaseReward });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
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
            assert.equal(await oracle.currentBalance.call(), 0);

            let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
            await token.approve(oracle.address, stakeContributed, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), stakeContributed.toString(), 
                'allowance does not match approved stake');

            let votedResultIndex = 2;
            await oracle.voteResult(votedResultIndex, stakeContributed, { from: participant1 });

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
                await oracle.voteResult(votedResultIndex, stakeContributed, { from: participant1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws if the botAmount is 0", async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = web3.eth.blockNumber;
            assert(blockNumber >= testOracleParams._eventBettingEndBlock, 
                "Block should be at or after eventBettingEndBlock");
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                "Block should be below decisionEndBlock");

            try {
                let votedResultIndex = 0;
                await oracle.voteResult(votedResultIndex, 0, { from: participant1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws if trying to vote before the eventBettingEndBlock", async function() {
            assert.isBelow(web3.eth.blockNumber, (await oracle.eventBettingEndBlock.call()).toNumber(), 
                "Block should be below eventBettingEndBlock");

            try {
                let votedResultIndex = 1;
                let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
                await oracle.voteResult(votedResultIndex, stakeContributed, { from: participant1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it("throws if trying to vote after the decisionEndBlock", async function() {
            await blockHeightManager.mineTo(testOracleParams._decisionEndBlock);
            assert(web3.eth.blockNumber >= (await oracle.decisionEndBlock.call()).toNumber(),
                "Block should be greater than or equal to decisionEndBlock");

            try {
                let votedResultIndex = 1;
                let stakeContributed = Utils.getBigNumberWithDecimals(3, botDecimals);
                await oracle.voteResult(votedResultIndex, stakeContributed, { from: participant1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
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

            let stake = Utils.getBigNumberWithDecimals(5, botDecimals);
            await token.approve(oracle.address, stake, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), stake.toString(), 
                'first allowance does not match approved stake');

            let votedResultIndex = 2;
            await oracle.voteResult(votedResultIndex, stake, { from: participant1 });

            assert.isTrue(await oracle.didSetResult({ from: participant1 }), "participant1 should have set result");
            assert.equal(await oracle.getVotedResultIndex({ from: participant1 }), votedResultIndex,
                "participant1 voted resultIndex does not match");

            await token.approve(oracle.address, stake, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), stake.toString(), 
                'second allowance does not match approved stake');
            try {
                await oracle.voteResult(votedResultIndex, stake, { from: participant1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('throws if the transferFrom allowance is less than the staking amount', async function() {
            await blockHeightManager.mineTo(validVotingBlock);
            let blockNumber = web3.eth.blockNumber;
            assert(blockNumber >= (await oracle.eventBettingEndBlock.call()).toNumber(), 
                'Block should be at or after eventBettingEndBlock');
            assert.isBelow(blockNumber, (await oracle.decisionEndBlock.call()).toNumber(), 
                'Block should be below decisionEndBlock');

            try {
                await oracle.voteResult(0, Utils.getBigNumberWithDecimals(5, botDecimals), { from: participant1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
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

            // staking
            await token.approve(oracle.address, winningStake1, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), winningStake1.toString(), 
                'participant1 allowance does not match approved');
            await oracle.voteResult(0, winningStake1, { from: participant1 });            

            await token.approve(oracle.address, winningStake2, { from: participant2 });
            assert.equal((await token.allowance(participant2, oracle.address)).toString(), winningStake2.toString(), 
                'participant2 allowance does not match approved');
            await oracle.voteResult(0, winningStake2, { from: participant2 });

            await token.approve(oracle.address, winningStake3, { from: participant3 });
            assert.equal((await token.allowance(participant3, oracle.address)).toString(), winningStake3.toString(), 
                'participant3 allowance does not match approved');
            await oracle.voteResult(0, winningStake3, { from: participant3 });

            await token.approve(oracle.address, losingStake1, { from: participant4 });
            assert.equal((await token.allowance(participant4, oracle.address)).toString(), losingStake1.toString(), 
                'participant4 allowance does not match approved');
            await oracle.voteResult(1, losingStake1, { from: participant4 });

            await token.approve(oracle.address, losingStake2, { from: participant5 });
            assert.equal((await token.allowance(participant5, oracle.address)).toString(), losingStake2.toString(), 
                'participant5 allowance does not match approved');
            await oracle.voteResult(2, losingStake2, { from: participant5 });
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
                assertInvalidOpcode(e);
            }
        });

        it("throws if trying to withdraw before arbitrationOptionEndBlock", async function() {
            assert.isBelow(await getBlockNumber(), (await oracle.arbitrationOptionEndBlock.call()).toNumber(), 
                "Block should be below arbitrationOptionEndBlock");

            try {
                await oracle.withdrawEarnings({ from: participant1 });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
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
                assertInvalidOpcode(e);
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
                assertInvalidOpcode(e);
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

            await token.approve(oracle.address, botBalance, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), botBalance.toString(), 
                'allowance does not match approved');

            await oracle.voteResult(0, botBalance, { from: participant1 });

            let actualStakeContributed = await oracle.getStakeContributed({ from: participant1 });
            assert.equal(actualStakeContributed.toString(), botBalance.toString(), 
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

            await token.approve(oracle.address, botBalance, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), botBalance.toString(), 
                'allowance does not match approved');

            await oracle.voteResult(0, botBalance, { from: participant1 });
            assert.isTrue(await oracle.didSetResult({ from: participant1 }), "participant1 should have set result");
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

            await token.approve(oracle.address, botBalance, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), botBalance.toString(), 
                'allowance does not match approved');

            let votedResultIndex = 1;
            await oracle.voteResult(votedResultIndex, botBalance, { from: participant1 });

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
                assertInvalidOpcode(e);
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

            let stake1 = Utils.getBigNumberWithDecimals(3, botDecimals);
            await token.approve(oracle.address, stake1, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), stake1.toString(), 
                'participant1 allowance does not match approved');
            await oracle.voteResult(0, stake1, { from: participant1 });           

            let stake2 = Utils.getBigNumberWithDecimals(4, botDecimals);
            await token.approve(oracle.address, stake2, { from: participant2 });
            assert.equal((await token.allowance(participant2, oracle.address)).toString(), stake2.toString(), 
                'participant2 allowance does not match approved');
            await oracle.voteResult(1, stake2, { from: participant2 });

            let stake3 = Utils.getBigNumberWithDecimals(5, botDecimals);
            await token.approve(oracle.address, stake3, { from: participant3 });
            assert.equal((await token.allowance(participant3, oracle.address)).toString(), stake3.toString(), 
                'participant3 allowance does not match approved');
            await oracle.voteResult(1, stake3, { from: participant3 });

            let stake4 = Utils.getBigNumberWithDecimals(10, botDecimals);
            await token.approve(oracle.address, stake4, { from: participant4 });
            assert.equal((await token.allowance(participant4, oracle.address)).toString(), stake4.toString(), 
                'participant4 allowance does not match approved');
            await oracle.voteResult(2, stake4, { from: participant4 });

            let stake5 = Utils.getBigNumberWithDecimals(1, botDecimals);
            await token.approve(oracle.address, stake5, { from: participant5 });
            assert.equal((await token.allowance(participant5, oracle.address)).toString(), stake5.toString(), 
                'participant5 allowance does not match approved');
            await oracle.voteResult(2, stake5, { from: participant5 });
            
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
                assertInvalidOpcode(e);
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

            // staking
            await token.approve(oracle.address, winningStake1, { from: participant1 });
            assert.equal((await token.allowance(participant1, oracle.address)).toString(), winningStake1.toString(), 
                'participant1 allowance does not match approved');
            await oracle.voteResult(1, winningStake1, { from: participant1 });            

            await token.approve(oracle.address, winningStake2, { from: participant2 });
            assert.equal((await token.allowance(participant2, oracle.address)).toString(), winningStake2.toString(), 
                'participant2 allowance does not match approved');
            await oracle.voteResult(1, winningStake2, { from: participant2 });

            await token.approve(oracle.address, winningStake3, { from: participant3 });
            assert.equal((await token.allowance(participant3, oracle.address)).toString(), winningStake3.toString(), 
                'participant3 allowance does not match approved');
            await oracle.voteResult(1, winningStake3, { from: participant3 });

            await token.approve(oracle.address, losingStake1, { from: participant4 });
            assert.equal((await token.allowance(participant4, oracle.address)).toString(), losingStake1.toString(), 
                'participant4 allowance does not match approved');
            await oracle.voteResult(0, losingStake1, { from: participant4 });

            await token.approve(oracle.address, losingStake2, { from: participant5 });
            assert.equal((await token.allowance(participant5, oracle.address)).toString(), losingStake2.toString(), 
                'participant5 allowance does not match approved');
            await oracle.voteResult(2, losingStake2, { from: participant5 });
          
            await token.approve(oracle.address, losingStake3, { from: participant6 });
            assert.equal((await token.allowance(participant6, oracle.address)).toString(), losingStake3.toString(), 
                'participant6 allowance does not match approved');
            await oracle.voteResult(0, losingStake3, { from: participant6 });

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
