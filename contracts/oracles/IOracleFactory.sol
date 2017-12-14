pragma solidity ^0.4.18;

contract IOracleFactory {
    function createCentralizedOracle(
        address _oracle, 
        address _eventAddress, 
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults, 
        uint256 _bettingEndBlock, 
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold) 
        public returns (address);

    function createDecentralizedOracle(
        address _eventAddress, 
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults, 
        uint8 _lastResultIndex, 
        uint256 _arbitrationEndBlock, 
        uint256 _consensusThreshold) 
        public returns (address);
}
