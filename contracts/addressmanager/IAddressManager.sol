pragma solidity ^0.4.15;

contract IAddressManager {
    function getBodhiTokenAddress() public constant returns (address) {}
    function setBodhiTokenAddress(address _tokenAddress) public {}
    function getEventAddress(uint8 _indexOfAddress) public constant returns (address) {}
    function setEventAddress(uint8 _indexOfAddress, address _newContractAddress) public {}
    function getOracleAddress(uint8 _indexOfAddress) public constant returns (address) {}
    function setOracleAddress(uint8 _indexOfAddress, address _newContractAddress) public {}
}
