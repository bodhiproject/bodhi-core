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

	beforeEach(blockHeightManager.snapshot);
  	afterEach(blockHeightManager.revert);

  	beforeEach(async function() {
  		return await EventFactory.deployed({ from: eventFactoryCreator })
  		.then(async function(factory) {
  			eventFactory = factory;
  			return await eventFactory.createTopic(...Object.values(testTopicParams), { from: accounts[1] })
	  		.then(async function(transaction) {
	  			topic = await Topic.at(Utils.getAddressFromTransaction(transaction));
	  		});
  		});
  	});

  	describe('New Topic:', async function() {
  		it('initializes all the values of the new topic correctly', async function() {
  			console.log(topic);
  			var actualOwner = await topic.owner.call();
  			console.log(actualOwner);
  			assert.equal(actualOwner, accounts[0], 'Topic owner does not match.');
  		});
  	});
});
