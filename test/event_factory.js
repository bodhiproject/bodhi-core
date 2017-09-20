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
	  			topic = await Topic.at(Utils.getParamFromTransaction(transaction, "_topic"));
	  		});
  		});
  	});

  	describe('New Topic:', async function() {
  		it('initializes all the values of the new topic correctly', async function() {
  			assert.equal(await topic.owner.call(), topicCreator, 'Topic owner does not match.');  			
  		});
  	});
});
