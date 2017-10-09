const OracleFactory = artifacts.require("./oracles/OracleFactory.sol");
const Oracle = artifacts.require("./oracles/Oracle.sol");
const BlockHeightManager = require('./helpers/block_height_manager');
const Utils = require('./helpers/utils');
const assert = require('chai').assert;
const web3 = global.web3;

contract('OracleFactory', function(accounts) {
  it("should assert true", function(done) {
    var oracle_factory = OracleFactory.deployed();
    assert.isTrue(true);
    done();
  });
});
