pragma solidity ^0.4.18;

contract IOracleFactory {
    function createCentralizedOracle(
        address _eventAddress, 
        uint8 _numOfResults, 
        address _oracle, 
        uint256 _bettingStartBlock,
        uint256 _bettingEndBlock, 
        uint256 _resultSettingStartBlock,
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold) 
        public returns (address);

    function createDecentralizedOracle(
        address _eventAddress, 
        uint8 _numOfResults, 
        uint8 _lastResultIndex, 
        uint256 _arbitrationEndBlock, 
        uint256 _consensusThreshold) 
        public returns (address);
}
