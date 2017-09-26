const EventFactory = artifacts.require("./events/EventFactory.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const BlockHeightManager = require('./helpers/block_height_manager');
const Utils = require('./helpers/utils');
const web3 = global.web3;
const assert = require('chai').assert;

contract('EventFactory', function(accounts) {
    const blockHeightManager = new BlockHeightManager(web3);
    const testTopicParams = {
        _resultSetter: accounts[1],
        _name: 'test',
        _resultNames: ['first', 'second', 'third'],
        _bettingEndBlock: 100
    };

    let eventFactory;
    let eventFactoryCreator = accounts[0];
    let topic;
    let topicCreator = accounts[1];

    beforeEach(blockHeightManager.snapshot);
    afterEach(blockHeightManager.revert);

    beforeEach(async function() {
        eventFactory = await EventFactory.deployed({ from: eventFactoryCreator });
        let transaction = await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
        topic = await TopicEvent.at(Utils.getParamFromTransaction(transaction, '_topicEvent'));
    });

    describe('TopicEvent:', async function() {
        it('initializes all the values of the new topic correctly', async function() {
            assert.equal(await topic.owner.call(), topicCreator, 'Topic owner does not match.');
            assert.equal(web3.toUtf8(await topic.name.call()), testTopicParams._name, 'Topic name does not match.');
            assert.equal(web3.toUtf8(await topic.getResultName(0)), testTopicParams._resultNames[0], 
                'Result name 1 does not match.');
            assert.equal(web3.toUtf8(await topic.getResultName(1)), testTopicParams._resultNames[1],
                'Result name 2 does not match.');
            assert.equal(web3.toUtf8(await topic.getResultName(2)), testTopicParams._resultNames[2],
                'Result name 3 does not match.');
            assert.equal(await topic.bettingEndBlock.call(), testTopicParams._bettingEndBlock,
                'Topic betting end block does not match.');
        });

        it('does not allow recreating the same topic twice', async function() {
            let topicExists = await eventFactory.doesTopicExist(testTopicParams._name, testTopicParams._resultNames,
                testTopicParams._bettingEndBlock);
            assert.isTrue(topicExists, 'Topic should already exist.');

            try {
                await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator });
            } catch(e) {
                assert.match(e.message, /invalid opcode/);
            }
        });

        it('allows betting if the bettingEndBlock has not been reached', async function() {
            assert.isBelow(web3.eth.blockNumber, testTopicParams._bettingEndBlock, 
                'Current block is greater than or equal to bettingEndBlock.');

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
            assert.equal(difference, totalBetAmount, 'New result balance does not match added bet.');

            let resultBalance = await topic.getResultBalance(betResultIndex);
            assert.equal(resultBalance.toString(), totalBetAmount.toString(), 'Result balance does not match.');

            var betBalance = await topic.getBetBalance(betResultIndex, { from: better1 });
            assert.equal(betBalance.toString(), betAmount1.toString(), 'Better1 bet balance does not match.');

            betBalance = await topic.getBetBalance(betResultIndex, { from: better2 });
            assert.equal(betBalance.toString(), betAmount2.toString(), 'Better2 bet balance does not match.');
        });

        it('allows the owner to reveal the result if the bettingEndBlock has been reached', async function() {
            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            assert.isAtLeast(web3.eth.blockNumber, testTopicParams._bettingEndBlock, 'Block is not at bettingEndBlock');

            var finalResultSet = await topic.finalResultSet.call();
            assert.isFalse(finalResultSet, 'Final result should not be set.');

            let testFinalResultIndex = 2;
            await topic.revealResult(testFinalResultIndex, { from: topicCreator });

            finalResultSet = await topic.finalResultSet.call();
            assert.isTrue(finalResultSet, 'Final result should be set.');

            let finalResultIndex = await topic.getFinalResultIndex();
            assert.equal(finalResultIndex, testFinalResultIndex, 'Final result index does not match.');

            let finalResultName = await topic.getFinalResultName();
            assert.equal(web3.toUtf8(finalResultName), testTopicParams._resultNames[testFinalResultIndex], 
                'Final result name does not match.');
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
            assert.equal(resultBalance.toString(), expectedResultBalance.toString(), 
                'Result balance does not match.');

            let totalTopicBalance = web3.toBigNumber(await topic.getTotalTopicBalance());
            let expectedTotalTopicBalance = web3.toBigNumber(totalBetAmount);
            assert.equal(totalTopicBalance.toString(), expectedTotalTopicBalance.toString(), 
                'Total topic balance does not match.');

            await blockHeightManager.mineTo(testTopicParams._bettingEndBlock);
            let currentBlock = web3.eth.blockNumber;
            assert.isAtLeast(currentBlock, testTopicParams._bettingEndBlock);   
            
            // Reveal result
            let testFinalResultIndex = 1;
            await topic.revealResult(testFinalResultIndex, { from: topicCreator });

            let finalResultSet = await topic.finalResultSet.call();
            assert.isTrue(finalResultSet, 'Final result should be set.');

            let finalResultIndex = await topic.getFinalResultIndex();
            assert.equal(finalResultIndex, testFinalResultIndex, 'Final result index does not match.');

            let finalResultName = await topic.getFinalResultName();
            assert.equal(web3.toUtf8(finalResultName), testTopicParams._resultNames[testFinalResultIndex], 
                'Final result index does not match.');

            // Withdraw winnings: accounts[1]
            var expectedWithdrawAmount = totalTopicBalance * betAmount1 / resultBalance;
            await topic.withdrawWinnings({ from: better1 });
            var accountBetBalance = web3.toBigNumber(await topic.getBetBalance(testFinalResultIndex, { from: better1 }));
            assert.equal(accountBetBalance.toString(), 0, "Account1 bet balance should be 0.");

            // Withdraw winnings: a
            expectedWithdrawAmount = totalTopicBalance * betAmount2 / resultBalance;
            await topic.withdrawWinnings({ from: better2 });
            accountBetBalance = web3.toBigNumber(await topic.getBetBalance(testFinalResultIndex, { from: better2 }));
            assert.equal(accountBetBalance.toString(), 0, "Account2 bet balance should be 0.");
        });
    });
});
