pragma solidity ^0.4.18;

contract IAddressManager {
    function setEventFactoryAddress(uint8 _indexOfAddress, address _newContractAddress) public;
    function setBodhiTokenAddress(address _tokenAddress) public;
    function setOracleFactoryAddress(uint8 _indexOfAddress, address _newContractAddress) public;
    function getBodhiTokenAddress() public view returns (address);
    function getCurrentEventFactoryIndex() public view returns (uint16);
    function getEventFactoryAddress(uint8 _indexOfAddress) public view returns (address);
    function getCurrentOracleFactoryIndex() public view returns (uint16);
    function getOracleFactoryAddress(uint8 _indexOfAddress) public view returns (address);
}
