pragma solidity ^0.4.15;

import "../libs/IdUtils.sol";
import "./Oracle.sol";

contract OracleFactory {
    mapping (bytes32 => Oracle) public oracles;

    // Events
    event OracleCreated(address indexed _creator, Oracle _oracle, bytes _eventName, bytes32[] _eventResultNames, 
        uint256 _eventBettingEndBlock, uint256 _decisionEndBlock, uint256 _arbitrationOptionEndBlock, 
        uint256 _baseRewardAmount);

    function createOracle(
        bytes _eventName, 
        bytes32[] _eventResultNames, 
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock)
        public
        payable
        returns (Oracle oracleAddress)
    {
        bytes32 oracleHash = IdUtils.getOracleHash(_eventName, _eventResultNames, _eventBettingEndBlock, 
            _decisionEndBlock, _arbitrationOptionEndBlock);
        // Oracle should not exist yet
        require(address(oracles[oracleHash]) == 0);

        Oracle oracle = new Oracle(msg.sender, _eventName, _eventResultNames, _eventBettingEndBlock, _decisionEndBlock, 
            _arbitrationOptionEndBlock);
        oracle.addBaseReward.value(msg.value)();
        oracles[oracleHash] = oracle;

        OracleCreated(msg.sender, oracle, _eventName, _eventResultNames, _eventBettingEndBlock, _decisionEndBlock, 
            _arbitrationOptionEndBlock, msg.value);
        return oracle;
    }

    function doesOracleExist(
        bytes _eventName, 
        bytes32[] _eventResultNames, 
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock)
        public
        constant
        returns (bool)
    {
        bytes32 oracleHash = IdUtils.getOracleHash(_eventName, _eventResultNames, _eventBettingEndBlock, 
            _decisionEndBlock, _arbitrationOptionEndBlock);
        return address(oracles[oracleHash]) != 0;
    }
}
