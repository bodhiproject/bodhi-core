pragma solidity ^0.4.15;

import "../libs/Ownable.sol";

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

    /// @notice Gets the current address of the Bodhi Token contract.
    /// @return The address of Bodhi Token contract.
    function getBodhiTokenAddress() 
        public 
        constant 
        returns (address) 
    {
        return bodhiTokenAddress;
    }

    /// @dev Allows the owner to set the address of the Bodhi Token contract.
    /// @param _tokenAddress The address of the latest Bodhi Token contract.
    function setBodhiTokenAddress(address _tokenAddress) 
        public 
        onlyOwner 
        validAddress(_tokenAddress) 
    {
        BodhiTokenAddressChanged(bodhiTokenAddress, _tokenAddress);
        bodhiTokenAddress = _tokenAddress;
    }

    /// @notice Gets the address of the Event contract.
    /// @param _indexOfAddress The index of the stored Event contract address.
    /// @return The address of Event contract.
    function getEventAddress(uint8 _indexOfAddress) 
        public 
        constant 
        returns (address) 
    {
        return eventAddresses[_indexOfAddress];
    }

    /// @dev Allows the owner to set the address of an Event contract.
    /// @param _indexOfAddress The index of where to store the Event contract.
    /// @param _newContractAddress The address of the latest Event contract.
    function setEventAddress(uint8 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        EventAddressChanged(_indexOfAddress, eventAddresses[_indexOfAddress], _newContractAddress);
        eventAddresses[_indexOfAddress] = _newContractAddress;
    }

    /// @notice Gets the address of the Oracle contract.
    /// @param _indexOfAddress The index of the stored Oracle contract address.
    /// @return The address of Oracle contract.
    function getOracleAddress(uint8 _indexOfAddress) 
        public 
        constant 
        returns (address) 
    {
        return oracleAddresses[_indexOfAddress];
    }

    /// @dev Allows the owner to set the address of an Oracle contract.
    /// @param _indexOfAddress The index of where to store the Oracle contract.
    /// @param _newContractAddress The address of the latest Oracle contract.
    function setOracleAddress(uint8 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        OracleAddressChanged(_indexOfAddress, oracleAddresses[_indexOfAddress], _newContractAddress);
        oracleAddresses[_indexOfAddress] = _newContractAddress;
    }
}
