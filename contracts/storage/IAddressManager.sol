pragma solidity ^0.4.18;

contract IAddressManager {
    uint16 public currentEventFactoryIndex;
    uint16 public currentOracleFactoryIndex;
    address public bodhiTokenAddress;
    uint256 public eventEscrowAmount;
    uint256 public arbitrationLength;
    uint256 public startingOracleThreshold;
    uint256 public consensusThresholdIncrement;
    mapping(uint16 => address) public eventFactoryVersionToAddress;
    mapping(uint16 => address) public oracleFactoryVersionToAddress;

    function setBodhiTokenAddress(address _tokenAddress) public;
    function getLastEventFactoryIndex() public view returns (uint16 lastEventFactoryIndex);
    function getLastOracleFactoryIndex() public view returns (uint16 lastOracleFactoryIndex);
}
