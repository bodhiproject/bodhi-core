const AddressManager = artifacts.require("./addressmanager/AddressManager.sol");

module.exports = function(deployer) {
    deployer.deploy(AddressManager);
};
