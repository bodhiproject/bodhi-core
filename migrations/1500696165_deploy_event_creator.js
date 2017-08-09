var SafeMath = artifacts.require("./SafeMath.sol");
var Event = artifacts.require("./Event.sol");
var EventCreator = artifacts.require("./EventCreator.sol");

module.exports = function(deployer) {
	deployer.deploy(SafeMath);
	deployer.link(SafeMath, Event);
	deployer.deploy(Event);
	deployer.link(Event, EventCreator);
	deployer.deploy(EventCreator);
};

