pragma solidity ^0.4.18;

contract IOracleFactory {
    function createCentralizedOracle(
        address _eventAddress, 
        uint8 _numOfResults, 
        address _oracle, 
        uint256 _bettingStartTime,
        uint256 _bettingEndTime,
        uint256 _resultSettingStartTime,
        uint256 _resultSettingEndTime,
        uint256 _consensusThreshold) 
        public returns (address);

    function createDecentralizedOracle(
        address _eventAddress, 
        uint8 _numOfResults, 
        uint8 _lastResultIndex, 
        uint256 _arbitrationEndTime,
        uint256 _consensusThreshold) 
        public returns (address);
}
