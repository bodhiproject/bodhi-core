pragma solidity ^0.4.18;

contract IOracleFactory {
    function createOracle(bytes32[10] _eventName, bytes32[10] _eventResultNames, uint8 _lastResultIndex, 
        uint256 _arbitrationEndBlock, uint256 _consensusThreshold) public returns (address);
}
