const BodhiToken = artifacts.require("./tokens/BodhiToken.sol");
const AddressManager = artifacts.require("./addressmanager/AddressManager.sol");
const EventFactory = artifacts.require("./events/EventFactory.sol");
const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const SafeMath = artifacts.require("./libs/SafeMath.sol");
const ByteUtils = artifacts.require("./libs/ByteUtils.sol");
const TopicEvent = artifacts.require("./events/TopicEvent.sol");
const DecentralizedOracle = artifacts.require("./oracles/DecentralizedOracle.sol");

module.exports = function(deployer) {
    deployer.deploy(BodhiToken);

    deployer.deploy(SafeMath);
    deployer.link(SafeMath, [TopicEvent, DecentralizedOracle]);

    deployer.deploy(ByteUtils);
    deployer.link(ByteUtils, [TopicEvent, DecentralizedOracle]);
    
    deployer.deploy(AddressManager).then(function() {
        return deployer.deploy(EventFactory, AddressManager.address).then(function() {
            return deployer.deploy(OracleFactory, AddressManager.address);
        });
    });
};
