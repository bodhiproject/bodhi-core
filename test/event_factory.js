const EventFactory = artifacts.require("./EventFactory.sol");
const Topic = artifacts.require("./Topic.sol");
const BlockHeightManager = require('./helpers/block_height_manager');
const Utils = require('./helpers/utils');
const web3 = global.web3;
const assert = require('chai').assert;

contract('EventFactory', function(accounts) {
	const blockHeightManager = new BlockHeightManager(web3);
	const testTopicParams = {
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
		topic = await Topic.at(Utils.getParamFromTransaction(transaction, '_topic'));
	});

	describe('Topic:', async function() {
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
	});
});
