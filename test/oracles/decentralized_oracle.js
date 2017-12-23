const web3 = global.web3;
const assert = require('chai').assert;
const bluebird = require('bluebird');
const BodhiToken = artifacts.require("./tokens/BodhiToken.sol");
const AddressManager = artifacts.require("./storage/AddressManager.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const CentralizedOracle = artifacts.require("./oracles/CentralizedOracle.sol");
const DecentralizedOracle = artifacts.require("./oracles/DecentralizedOracle.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const Utils = require('../helpers/utils');
const SolAssert = require('../helpers/sol_assert');

contract('DecentralizedOracle', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const getBlockNumber = bluebird.promisify(web3.eth.getBlockNumber);

    const BOT_DECIMALS = 8;
    const ADMIN = accounts[0];
    const ORACLE = accounts[1];
    const USER1 = accounts[2];
    const USER2 = accounts[3];
    const USER3 = accounts[4];
    const USER4 = accounts[5];
    const USER5 = accounts[6];
    const USER6 = accounts[7];
    const CENTRALIZED_ORACLE_RESULT = 1;
    const TOPIC_EVENT_PARAMS = {
        _oracle: ORACLE,
        _name: ["Who will be the next president i", "n the 2020 election?"],
        _resultNames: ["Trump", "The Rock", "Hilary"],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 120
    };
    
    let token;
    let addressManager;
    let topicEvent;
    let centralizedOracle;
    let decentralizedOracle;
    let arbitrationBlockLength;
    let consensusIncrement;

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        // Fund accounts
        const botBalance = Utils.getBigNumberWithDecimals(10000, BOT_DECIMALS);

        token = await BodhiToken.deployed({ from: ADMIN });
        await token.mintByOwner(ORACLE, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(ORACLE)).toString(), botBalance.toString());
        await token.mintByOwner(USER1, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER1)).toString(), botBalance.toString());
        await token.mintByOwner(USER2, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER2)).toString(), botBalance.toString());
        await token.mintByOwner(USER3, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER3)).toString(), botBalance.toString());
        await token.mintByOwner(USER4, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER4)).toString(), botBalance.toString());
        await token.mintByOwner(USER5, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER5)).toString(), botBalance.toString());
        await token.mintByOwner(USER6, botBalance, { from: ADMIN });
        assert.equal((await token.balanceOf(USER6)).toString(), botBalance.toString());

        // Init AddressManager
        addressManager = await AddressManager.deployed({ from: ADMIN });
        await addressManager.setBodhiTokenAddress(token.address, { from: ADMIN });
        assert.equal(await addressManager.bodhiTokenAddress.call(), token.address);

        arbitrationBlockLength = (await addressManager.arbitrationBlockLength.call()).toNumber();
        consensusIncrement = (await addressManager.consensusThresholdIncrement.call()).toNumber();

        // Init factories
        let eventFactory = await EventFactory.deployed(addressManager.address, { from: ADMIN });
        await addressManager.setEventFactoryAddress(eventFactory.address, { from: ADMIN });
        assert.equal(await addressManager.getEventFactoryAddress(0), eventFactory.address);

        let oracleFactory = await OracleFactory.deployed(addressManager.address, { from: ADMIN });
        await addressManager.setOracleFactoryAddress(oracleFactory.address, { from: ADMIN });
        assert.equal(await addressManager.getOracleFactoryAddress(0), oracleFactory.address);

        // Init TopicEvent
        let tx = await eventFactory.createTopic(...Object.values(TOPIC_EVENT_PARAMS), { from: ORACLE });
        topicEvent = TopicEvent.at(tx.logs[0].args._topicAddress);
        centralizedOracle = CentralizedOracle.at((await topicEvent.oracles.call(0))[0]);

        // Betting
        let bet1 = Utils.getBigNumberWithDecimals(20, BOT_DECIMALS);
        await centralizedOracle.bet(CENTRALIZED_ORACLE_RESULT, { from: USER1, value: bet1 });
        assert.equal((await topicEvent.getBetBalances({ from: USER1 }))[CENTRALIZED_ORACLE_RESULT].toString(), 
            bet1.toString());

        let bet2 = Utils.getBigNumberWithDecimals(30, BOT_DECIMALS);
        await centralizedOracle.bet(CENTRALIZED_ORACLE_RESULT, { from: USER2, value: bet2 });
        assert.equal((await topicEvent.getBetBalances({ from: USER2 }))[CENTRALIZED_ORACLE_RESULT].toString(), 
            bet2.toString());

        let bet3 = Utils.getBigNumberWithDecimals(11, BOT_DECIMALS);
        await centralizedOracle.bet(0, { from: USER3, value: bet3 });
        assert.equal((await topicEvent.getBetBalances({ from: USER3 }))[0].toString(), bet3.toString());

        // CentralizedOracle set result
        await blockHeightManager.mineTo(TOPIC_EVENT_PARAMS._bettingEndBlock);
        assert.isAtLeast(await getBlockNumber(), TOPIC_EVENT_PARAMS._bettingEndBlock);
        assert.isBelow(await getBlockNumber(), TOPIC_EVENT_PARAMS._resultSettingEndBlock);

        assert.isFalse(await centralizedOracle.finished.call());
        assert.equal(await centralizedOracle.oracle.call(), ORACLE);

        let consensusThreshold = await centralizedOracle.consensusThreshold.call();
        await token.approve(topicEvent.address, consensusThreshold, { from: ORACLE });
        assert.equal((await token.allowance(ORACLE, topicEvent.address)).toString(), 
            consensusThreshold.toString());
        await centralizedOracle.setResult(CENTRALIZED_ORACLE_RESULT, { from: ORACLE });

        // DecentralizedOracle created
        decentralizedOracle = await DecentralizedOracle.at((await topicEvent.oracles.call(1))[0]);
    });

    describe("constructor", async function() {
        let numOfResults = 3;
        let arbitrationEndBlock = 220;
        let consensusThreshold = Utils.getBigNumberWithDecimals(100, BOT_DECIMALS);

        it("inits the DecentralizedOracle with the correct values", async function() {
            assert.equal(await decentralizedOracle.eventAddress.call(), topicEvent.address);
            assert.equal(web3.toUtf8(await decentralizedOracle.eventName.call(0)), TOPIC_EVENT_PARAMS._name[0]);
            assert.equal(web3.toUtf8(await decentralizedOracle.eventName.call(1)), TOPIC_EVENT_PARAMS._name[1]);
            assert.equal(web3.toUtf8(await decentralizedOracle.eventResultNames.call(0)), 
                TOPIC_EVENT_PARAMS._resultNames[0]);
            assert.equal(web3.toUtf8(await decentralizedOracle.eventResultNames.call(1)), 
                TOPIC_EVENT_PARAMS._resultNames[1]);
            assert.equal(web3.toUtf8(await decentralizedOracle.eventResultNames.call(2)), 
                TOPIC_EVENT_PARAMS._resultNames[2]);
            assert.equal((await decentralizedOracle.numOfResults.call()).toNumber(), 3);
            assert.equal(await decentralizedOracle.lastResultIndex.call(), CENTRALIZED_ORACLE_RESULT);
            assert.equal((await decentralizedOracle.arbitrationEndBlock.call()).toNumber(), 
                (await getBlockNumber()) + arbitrationBlockLength);

            let threshold = await addressManager.startingOracleThreshold.call();
            assert.equal((await decentralizedOracle.consensusThreshold.call()).toNumber(), threshold.toNumber());
        });

        it('throws if eventAddress is invalid', async function() {
            try {
                await DecentralizedOracle.new(ADMIN, 0, TOPIC_EVENT_PARAMS._name, TOPIC_EVENT_PARAMS._resultNames, 
                    numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, consensusThreshold, { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it("throws if eventName is empty", async function() {
            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, [], TOPIC_EVENT_PARAMS._resultNames, 
                    numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, consensusThreshold, { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }

            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, [''], TOPIC_EVENT_PARAMS._resultNames, 
                    numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, consensusThreshold, { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it("throws if the eventResultNames 0 or 1 are empty", async function() {
            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, TOPIC_EVENT_PARAMS._name, [], 
                    numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, consensusThreshold, { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }

            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, TOPIC_EVENT_PARAMS._name, ['first'], 
                    numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, consensusThreshold, { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }

            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, TOPIC_EVENT_PARAMS._name, ['', 'second'], 
                    numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, consensusThreshold, { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if numOfResults is 0', async function() {
            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, 0, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, consensusThreshold, 
                    { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if arbitrationEndBlock is less than or equal to current block', async function() {
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock);

            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, 
                    consensusThreshold, { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if consensusThreshold is 0', async function() {
            try {
                await DecentralizedOracle.new(ADMIN, topicEvent.address, TOPIC_EVENT_PARAMS._name, 
                    TOPIC_EVENT_PARAMS._resultNames, numOfResults, CENTRALIZED_ORACLE_RESULT, arbitrationEndBlock, 0, 
                    { from: ADMIN });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });
    });

    describe('voteResult()', async function() {
        it('allows voting', async function() {
            assert.isBelow(await getBlockNumber(), (await decentralizedOracle.arbitrationEndBlock.call()).toNumber());

            let vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote1, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
            await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
            assert.equal((await decentralizedOracle.getVoteBalances({ from: USER1 }))[0].toString(),
                vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(5, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote2, { from: USER2 });
            assert.equal((await token.allowance(USER2, topicEvent.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(2, vote2, { from: USER2 });
            assert.equal((await decentralizedOracle.getVoteBalances({ from: USER2 }))[2].toString(),
                vote2.toString());

            assert.equal((await decentralizedOracle.getTotalVotes())[0].toString(), vote1.toString());  
            assert.equal((await decentralizedOracle.getTotalVotes())[2].toString(), vote2.toString());  
        });

        it('sets the result if the vote passes the consensusThreshold', async function() {
            assert.isBelow(await getBlockNumber(), (await decentralizedOracle.arbitrationEndBlock.call()).toNumber());

            assert.isFalse(await decentralizedOracle.finished.call());
            assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), 
                (await decentralizedOracle.invalidResultIndex.call()).toNumber());

            let consensusThreshold = await decentralizedOracle.consensusThreshold.call();
            await token.approve(topicEvent.address, consensusThreshold, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), consensusThreshold.toString());

            await decentralizedOracle.voteResult(2, consensusThreshold, { from: USER1 });
            assert.equal((await decentralizedOracle.getVoteBalances({ from: USER1 }))[2].toString(),
                consensusThreshold.toString());
            assert.equal((await decentralizedOracle.getTotalVotes())[2].toString(), consensusThreshold.toString());  

            assert.isTrue(await decentralizedOracle.finished.call());
            assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), 2);
        });

        it('throws if eventResultIndex is invalid', async function() {
            assert.isBelow(await getBlockNumber(), (await decentralizedOracle.arbitrationEndBlock.call()).toNumber());

            let vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote1, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());

            try {
                await decentralizedOracle.voteResult(CENTRALIZED_ORACLE_RESULT, vote1, { from: USER1 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if the Oracle is finished', async function() {
            let arbitrationEndBlock = (await decentralizedOracle.arbitrationEndBlock.call()).toNumber();
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock);

            assert.isFalse(await decentralizedOracle.finished.call());
            await decentralizedOracle.finalizeResult();
            assert.isTrue(await decentralizedOracle.finished.call());
            assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), CENTRALIZED_ORACLE_RESULT);

            let vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote1, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
            try {
                await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if botAmount is 0', async function() {
            assert.isBelow(await getBlockNumber(), (await decentralizedOracle.arbitrationEndBlock.call()).toNumber());

            try {
                await decentralizedOracle.voteResult(CENTRALIZED_ORACLE_RESULT, 0, { from: USER1 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });

        it('throws if the block is at the arbitrationEndBlock', async function() {
            let arbitrationEndBlock = (await decentralizedOracle.arbitrationEndBlock.call()).toNumber();
            await blockHeightManager.mineTo(arbitrationEndBlock);
            assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock);
            
            let vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote1, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());

            try {
                await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });
        
        it('throws if the voting on the lastResultIndex', async function() {
            let lastResultIndex = (await decentralizedOracle.lastResultIndex.call()).toNumber();
            
            let vote1 = Utils.getBigNumberWithDecimals(7, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote1, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());

            try {
                await decentralizedOracle.voteResult(lastResultIndex, vote1, { from: USER1 });
                assert.fail();
            } catch(e) {
                SolAssert.assertRevert(e);
            }
        });
    });

    describe('finalizeResult()', async function() {
        describe('in valid block range', async function() {
            beforeEach(async function() {
                let arbitrationEndBlock = (await decentralizedOracle.arbitrationEndBlock.call()).toNumber();
                await blockHeightManager.mineTo(arbitrationEndBlock);
                assert.isAtLeast(await getBlockNumber(), arbitrationEndBlock);
            });

            it('finalizes the result', async function() {
                assert.isFalse(await decentralizedOracle.finished.call());
                assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), 
                    (await decentralizedOracle.invalidResultIndex.call()).toNumber());

                await decentralizedOracle.finalizeResult();
                assert.isTrue(await decentralizedOracle.finished.call());
                assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), CENTRALIZED_ORACLE_RESULT);
            });

            it('throws if the Oracle is finished', async function() {
                await decentralizedOracle.finalizeResult();
                assert.isTrue(await decentralizedOracle.finished.call());
                assert.equal((await decentralizedOracle.resultIndex.call()).toNumber(), CENTRALIZED_ORACLE_RESULT);

                try {
                    await decentralizedOracle.finalizeResult();
                    assert.fail();
                } catch(e) {
                    SolAssert.assertRevert(e);
                }
            });
        });

        describe('in invalid block range', async function() {
            it('throws if the block is below the arbitrationEndBlock', async function() {
                let arbitrationEndBlock = (await decentralizedOracle.arbitrationEndBlock.call()).toNumber();
                assert.isBelow(await getBlockNumber(), arbitrationEndBlock);

                try {
                    await decentralizedOracle.finalizeResult();
                    assert.fail();
                } catch(e) {
                    SolAssert.assertRevert(e);
                }
            });
        });
    });

    describe('getVoteBalances()', async function() {
        it('returns the vote balances', async function() {
            let arbitrationEndBlock = (await decentralizedOracle.arbitrationEndBlock.call()).toNumber();
            assert.isBelow(await getBlockNumber(), arbitrationEndBlock);

            let vote1 = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote1, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
            await decentralizedOracle.voteResult(0, vote1, { from: USER1 });
            assert.equal((await decentralizedOracle.getVoteBalances({ from: USER1 }))[0].toString(), vote1.toString());

            let vote2 = Utils.getBigNumberWithDecimals(17, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote2, { from: USER2 });
            assert.equal((await token.allowance(USER2, topicEvent.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(2, vote2, { from: USER2 });
            assert.equal((await decentralizedOracle.getVoteBalances({ from: USER2 }))[2].toString(), vote2.toString());
        });
    });

    describe('getTotalVotes()', async function() {
        it('returns the total votes', async function() {
            let arbitrationEndBlock = (await decentralizedOracle.arbitrationEndBlock.call()).toNumber();
            assert.isBelow(await getBlockNumber(), arbitrationEndBlock);

            let vote1 = Utils.getBigNumberWithDecimals(10, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote1, { from: USER1 });
            assert.equal((await token.allowance(USER1, topicEvent.address)).toString(), vote1.toString());
            await decentralizedOracle.voteResult(0, vote1, { from: USER1 });

            let vote2 = Utils.getBigNumberWithDecimals(17, BOT_DECIMALS);
            await token.approve(topicEvent.address, vote2, { from: USER2 });
            assert.equal((await token.allowance(USER2, topicEvent.address)).toString(), vote2.toString());
            await decentralizedOracle.voteResult(0, vote2, { from: USER2 });

            let totalVotes = vote1.add(vote2);
            assert.equal((await decentralizedOracle.getTotalVotes())[0].toString(), totalVotes.toString());
        });
    });
});
