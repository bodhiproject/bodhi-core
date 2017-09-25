var SafeMath = artifacts.require("./libs/SafeMath.sol");
var Topic = artifacts.require("./Topic.sol");
var EventFactory = artifacts.require("./EventFactory.sol");

module.exports = function(deployer) {
	deployer.deploy(SafeMath);
	deployer.link(SafeMath, [Topic, EventFactory]);
	deployer.deploy(EventFactory);
};
