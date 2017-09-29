var SafeMath = artifacts.require("./libs/SafeMath.sol");
var EventFactory = artifacts.require("./events/EventFactory.sol");
var TopicEvent = artifacts.require("./events/TopicEvent.sol");

module.exports = function(deployer) {
	deployer.deploy(SafeMath);
	deployer.link(SafeMath, [TopicEvent, EventFactory]);
	deployer.deploy(EventFactory);
};
