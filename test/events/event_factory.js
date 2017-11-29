const AddressManager = artifacts.require("./storage/AddressManager.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const BlockHeightManager = require('../helpers/block_height_manager');
const assertInvalidOpcode = require('../helpers/assert_invalid_opcode');
const Utils = require('../helpers/utils');
const web3 = global.web3;
const assert = require('chai').assert;

contract('EventFactory', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const testTopicParams = {
        _oracle: accounts[1],
        _name: ['Will Apple stock reach $300 by t', 'he end of 2017?'],
        _resultNames: ['first', 'second', 'third'],
        _bettingEndBlock: 100,
        _resultSettingEndBlock: 110
    };

    let addressManager;
    let eventFactory;
    let eventFactoryCreator = accounts[0];
    let oracleFactory;
    let topic;
    let topicCreator = accounts[1];

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        addressManager = await AddressManager.deployed({ from: eventFactoryCreator });
        eventFactory = await EventFactory.deployed(addressManager.address, { from: eventFactoryCreator });
        oracleFactory = await OracleFactory.deployed(addressManager.address, { from: eventFactoryCreator });
        
        let transaction = await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
        topic = await TopicEvent.at(transaction.logs[0].args._topicAddress);
    });

    describe('constructor', async function() {
        it('should store the EventFactory address in AddressManager', async function() {
            let index = await addressManager.getLastEventFactoryIndex();
            assert.equal(await addressManager.getEventFactoryAddress(index), eventFactory.address);
        });

        it('throws if the AddressManager address is invalid', async function() {
            try {
                await EventFactory.new(0, { from: eventFactoryCreator });
                assert.fail();
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });
    });

    describe('TopicEvent:', async function() {
        it('initializes all the values of the new topic correctly', async function() {
            assert.equal(await topic.owner.call(), topicCreator);
            assert.equal((await topic.getOracle(0))[0], testTopicParams._oracle);
            assert.equal(await topic.getEventName(), testTopicParams._name.join(''));
            assert.equal(web3.toUtf8(await topic.resultNames.call(0)), testTopicParams._resultNames[0]);
            assert.equal(web3.toUtf8(await topic.resultNames.call(1)), testTopicParams._resultNames[1]);
            assert.equal(web3.toUtf8(await topic.resultNames.call(2)), testTopicParams._resultNames[2]);
            assert.equal((await topic.numOfResults.call()).toNumber(), 3);
            assert.equal(await topic.bettingEndBlock.call(), testTopicParams._bettingEndBlock);
            assert.equal(await topic.resultSettingEndBlock.call(), testTopicParams._resultSettingEndBlock);
        });

        it('does not allow recreating the same topic twice', async function() {
            let topicExists = await eventFactory.doesTopicExist(testTopicParams._name, testTopicParams._resultNames,
                testTopicParams._bettingEndBlock, testTopicParams._resultSettingEndBlock);
            assert.isTrue(topicExists);

            try {
                await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
            } catch(e) {
                assertInvalidOpcode(e);
            }
        });

        it('allows betting if the bettingEndBlock has not been reached', async function() {
            assert.isBelow(web3.eth.blockNumber, testTopicParams._bettingEndBlock);

            let initialBalance = web3.eth.getBalance(topic.address).toNumber();
            let betResultIndex = 0;

            let better1 = accounts[2];
            let betAmount1 = web3.toBigNumber(web3.toWei(1, 'ether'));
            let better2 = accounts[3];
            let betAmount2 = web3.toBigNumber(web3.toWei(2, 'ether'));
            let totalBetAmount = betAmount1.add(betAmount2);

            await topic.bet(betResultIndex, { from: better1, value: betAmount1 });
            await topic.bet(betResultIndex, { from: better2, value: betAmount2 });

            let newBalance = web3.eth.getBalance(topic.address).toNumber();
            let difference = newBalance - initialBalance;
            assert.equal(difference, totalBetAmount);

            let resultBalance = await topic.getResultBalance(betResultIndex);
            assert.equal(resultBalance.toString(), totalBetAmount.toString());

            var betBalance = await topic.getBetBalance(betResultIndex, { from: better1 });
            assert.equal(betBalance.toString(), betAmount1.toString());

            betBalance = await topic.getBetBalance(betResultIndex, { from: better2 });
            assert.equal(betBalance.toString(), betAmount2.toString());
        });

        it('allows the Oracle to reveal the result if the bettingEndBlock has been reached', async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(web3.eth.blockNumber, testTopicParams._bettingEndBlock);

            assert.isFalse(await topic.resultSet.call());

            let testFinalResultIndex = 2;
            await topic.revealResult(testFinalResultIndex, { from: topicCreator });
            assert.isTrue(await topic.resultSet.call());
            assert.equal(await topic.getFinalResultIndex(), testFinalResultIndex);

            assert.equal(web3.toUtf8(await topic.getFinalResultName()), 
                testTopicParams._resultNames[testFinalResultIndex]);
        });

        it('allows withdrawing of winnings if it has ended and the result was revealed', async function() {
            // Set bets
            let better1 = accounts[2];
            let betAmount1 = web3.toBigNumber(web3.toWei(1, 'ether'));

            let better2 = accounts[3];
            let betAmount2 = web3.toBigNumber(web3.toWei(2, 'ether'));

            let betResultIndex = 1;
            let totalBetAmount = betAmount1.add(betAmount2);

            await topic.bet(betResultIndex, { from: better1, value: betAmount1 })
            .then(async function() {
                await topic.bet(betResultIndex, { from: better2, value: betAmount2 });
            });

            var resultBalance = web3.toBigNumber(await topic.getResultBalance(betResultIndex));
            let expectedResultBalance = web3.toBigNumber(totalBetAmount);
            assert.equal(resultBalance.toString(), expectedResultBalance.toString());

            let totalTopicBalance = web3.toBigNumber(await topic.getTotalTopicBalance());
            let expectedTotalTopicBalance = web3.toBigNumber(totalBetAmount);
            assert.equal(totalTopicBalance.toString(), expectedTotalTopicBalance.toString());

            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            let currentBlock = web3.eth.blockNumber;
            assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);   
            
            // Reveal result
            let testFinalResultIndex = 1;
            await topic.revealResult(testFinalResultIndex, { from: topicCreator });
            assert.isTrue(await topic.resultSet.call());
            assert.equal(await topic.getFinalResultIndex(), testFinalResultIndex);
            assert.equal(web3.toUtf8(await topic.getFinalResultName()), 
                testTopicParams._resultNames[testFinalResultIndex]);

            // Withdraw winnings: accounts[1]
            var expectedWithdrawAmount = totalTopicBalance * betAmount1 / resultBalance;
            await topic.withdrawWinnings({ from: better1 });
            var accountBetBalance = web3.toBigNumber(await topic.getBetBalance(testFinalResultIndex, { from: better1 }));
            assert.equal(accountBetBalance.toString(), 0);

            // Withdraw winnings: a
            expectedWithdrawAmount = totalTopicBalance * betAmount2 / resultBalance;
            await topic.withdrawWinnings({ from: better2 });
            accountBetBalance = web3.toBigNumber(await topic.getBetBalance(testFinalResultIndex, { from: better2 }));
            assert.equal(accountBetBalance.toString(), 0);
        });
    });
});
