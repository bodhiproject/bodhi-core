const SafeMath = artifacts.require("./libs/SafeMath.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");

module.exports = function(deployer) {
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, [TopicEvent, EventFactory]);
    deployer.deploy(EventFactory);
};
