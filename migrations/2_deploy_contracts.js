const AddressManager = artifacts.require("./addressmanager/AddressManager.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const SafeMath = artifacts.require("./libs/SafeMath.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const Oracle = artifacts.require("./oracles/Oracle.sol");

module.exports = function(deployer) {
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, [TopicEvent, Oracle]);
    deployer.deploy(OracleFactory);
    
    deployer.deploy(AddressManager).then(function() {
        return deployer.deploy(EventFactory, AddressManager.address);
    });
};
