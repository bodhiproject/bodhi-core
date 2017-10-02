pragma solidity ^0.4.15;

contract AddressManager is Ownable {
    address public bodhiTokenAddress;
    mapping(uint8 => address) public eventAddresses;
    mapping(uint8 => address) public oracleAddresses;

    // Modifiers
    modifier validAddress(address _address) {
        require(_address != address(0));
        _;
    }

    // Events
    event BodhiTokenAddressChanged(address indexed _oldAddress, address indexed _newAddress);
    event EventAddressChanged(uint8 _indexOfAddress, address indexed _oldAddress, address indexed _newAddress);
    event OracleAddressChanged(uint8 _indexOfAddress, address indexed _oldAddress, address indexed _newAddress);

    function getBodhiTokenAddress() 
        public 
        constant 
        return(address) 
    {
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

    function getEventAddress(uint8 _indexOfAddress) 
        public 
        constant 
        return(address) 
    {
        return eventAddresses[_indexOfAddress];
    }

    function setEventAddress(uint8 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        EventAddressChanged(_indexOfAddress, eventAddresses[_indexOfAddress], _newContractAddress);
        eventAddresses[_indexOfAddress] = _newContractAddress;
    }

    function getOracleAddress(uint8 _indexOfAddress) 
        public 
        constant 
        return(address) 
    {
        return oracleAddresses[_indexOfAddress];
    }

    function setOracleAddress(uint8 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        OracleAddressChanged(_indexOfAddress, oracleAddresses[_indexOfAddress], _newContractAddress);
        oracleAddresses[_indexOfAddress] = _newContractAddress;
    }
}
