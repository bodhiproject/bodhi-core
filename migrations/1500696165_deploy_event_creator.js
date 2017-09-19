var SafeMath = artifacts.require("./SafeMath.sol");
var Topic = artifacts.require("./Topic.sol");
var EventCreator = artifacts.require("./EventCreator.sol");

module.exports = function(deployer) {
	deployer.deploy(SafeMath);
	deployer.link(SafeMath, [Topic, EventCreator]);
	deployer.deploy(EventCreator);
};
