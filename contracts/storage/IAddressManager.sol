pragma solidity ^0.4.18;

contract IAddressManager {
    uint16 public arbitrationBlockLength;
    uint16 public currentEventFactoryIndex;
    uint16 public currentOracleFactoryIndex;
    address public bodhiTokenAddress;
    uint256 public startingOracleThreshold;
    uint256 public consensusThresholdIncrement;

    function setBodhiTokenAddress(address _tokenAddress) public;
    function getLastEventFactoryIndex() public view returns (uint16);
    function getEventFactoryAddress(uint16 _indexOfAddress) public view returns (address);
    function getLastOracleFactoryIndex() public view returns (uint16);
    function getOracleFactoryAddress(uint16 _indexOfAddress) public view returns (address);
}
