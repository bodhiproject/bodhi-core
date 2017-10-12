const AddressManager = artifacts.require("./addressmanager/AddressManager.sol");
const IdUtils = artifacts.require("./libs/IdUtils.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const SafeMath = artifacts.require("./libs/SafeMath.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const Oracle = artifacts.require("./oracles/Oracle.sol");

module.exports = function(deployer) {
    deployer.deploy(AddressManager);
    deployer.deploy(IdUtils);
    deployer.link(IdUtils, [EventFactory, OracleFactory]);
    deployer.deploy(EventFactory);
    deployer.deploy(OracleFactory);
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, [TopicEvent, Oracle]);
};
