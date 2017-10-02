pragma solidity ^0.4.15;

contract AddressManager is Ownable {
    address bodhiTokenAddress;
    address[] eventAddresses;
    address[] oracleAddresses;

    // Modifiers
    modifier validAddress(address _address) {
        require(_address != address(0));
        _;
    }

    // Events
    event BodhiTokenAddressChanged(address indexed _oldAddress, address indexed _newAddress);

    function getBodhiTokenAddress() public constant return(address) {
        return bodhiTokenAddress;
    }

    function setBodhiTokenAddress(address _tokenAddress) 
        public 
        onlyOwner 
        validAddress(_tokenAddress) 
    {
        BodhiTokenAddressChanged(bodhiTokenAddress, _tokenAddress);
        bodhiTokenAddress = _tokenAddress;
    }
}
