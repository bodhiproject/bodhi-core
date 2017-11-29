pragma solidity ^0.4.18;

contract IAddressManager {
    uint16 public arbitrationBlockLength;
    address public bodhiTokenAddress;

    function setBodhiTokenAddress(address _tokenAddress) public;
    function setEventFactoryAddress(address _sender, address _contractAddress) public;
    function setOracleFactoryAddress(address _sender, address _contractAddress) public;
    function getLastEventFactoryIndex() public view returns (uint16);
    function getEventFactoryAddress(uint16 _indexOfAddress) public view returns (address);
    function getLastOracleFactoryIndex() public view returns (uint16);
    function getOracleFactoryAddress(uint16 _indexOfAddress) public view returns (address);
}
