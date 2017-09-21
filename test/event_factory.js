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
		return await EventFactory.deployed({ from: eventFactoryCreator })
		.then(async function(factory) {
			eventFactory = factory;
			return await eventFactory.createTopic(...Object.values(testTopicParams), { from: topicCreator })
			.then(async function(transaction) {
				topic = await Topic.at(Utils.getParamFromTransaction(transaction, '_topic'));
			});
		});
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
	});
});
