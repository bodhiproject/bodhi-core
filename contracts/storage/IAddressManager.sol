pragma solidity ^0.4.18;

contract IAddressManager {
    function getBodhiTokenAddress() public constant returns (address);
    function setBodhiTokenAddress(address _tokenAddress) public;
    function getEventFactoryAddress(uint8 _indexOfAddress) public constant returns (address);
    function setEventFactoryAddress(uint8 _indexOfAddress, address _newContractAddress) public;
    function getOracleFactoryAddress(uint8 _indexOfAddress) public constant returns (address);
    function setOracleFactoryAddress(uint8 _indexOfAddress, address _newContractAddress) public;
}
