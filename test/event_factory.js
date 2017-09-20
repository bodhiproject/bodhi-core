const EventFactory = artifacts.require("./EventFactory.sol");
const BlockHeightManager = require('./helpers/block_height_manager');
const utils = require('./helpers/utils')
const web3 = global.web3;
const assert = require('chai').assert;

contract('EventFactory', function(accounts) {
	const blockHeightManager = new BlockHeightManager(web3);
	const testTopicParams = {
		_name: "test",
		_resultNames: ["first", "second", "third"],
		_bettingEndBlock: 100
	};

	let eventFactory;
	let eventFactoryCreator = accounts[0];
	let topic;

	beforeEach(blockHeightManager.snapshot);
  	afterEach(blockHeightManager.revert);

  	beforeEach(async function() {
  		eventFactory = await EventFactory.deployed({ from: eventFactoryCreator });
  		
  		let txn = await eventFactory.createTopic(...Object.values(testTopicParams), { from: accounts[1] });
  		
  	});

  	describe('New Topic:', async function() {
  		it('initializes all the values of the new topic correctly', async function() {
  			eventFactory = await EventFactory.deployed({ from: eventFactoryCreator });
  			return await eventFactory.createTopic(...Object.values(testTopicParams), { from: accounts[1] })
  			.then(function(txn) {
  				console.log(txn);
  				topic = Topic.at(txn);
  				assert.equal(topic.owner.call(), accounts[1], "Topic owner does not match.");
  			});

  	// 		return EventFactory.deployed({ from: eventFactoryCreator })
			// .then(function(_eventFactory) {
			// 	eventFactory = _eventFactory;
			// 	return eventFactory.createTopic(...Object.values(testTopicParams), { from: accounts[1] })
			// 	.then(function(txn) {
			// 		console.log("createTopic transaction hash: " + txn);
			// 		assert.equal(txn, accounts[1]);
			// 		return web3.eth.getTransactionReceipt(txn);
			// 	})
			// });
  		});
  	});
});
