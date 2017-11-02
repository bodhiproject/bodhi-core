pragma solidity ^0.4.18;

contract IAddressManager {
    function getBodhiTokenAddress() public constant returns (address);
    function setBodhiTokenAddress(address _tokenAddress) public;
}
