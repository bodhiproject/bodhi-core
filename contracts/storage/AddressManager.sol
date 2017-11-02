pragma solidity ^0.4.15;

import "../libs/Ownable.sol";

contract AddressManager is Ownable {
    address public bodhiTokenAddress;
    mapping(uint8 => address) public eventFactoryAddresses;
    mapping(uint8 => address) public oracleFactoryAddresses;

    // Events
    event BodhiTokenAddressChanged(address indexed _oldAddress, address indexed _newAddress);
    event EventFactoryAddressChanged(uint8 _indexOfAddress, address indexed _oldAddress, address indexed _newAddress);
    event OracleFactoryAddressChanged(uint8 _indexOfAddress, address indexed _oldAddress, address indexed _newAddress);

    function AddressManager() public Ownable(msg.sender) {
    }

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
    /// @param _tokenAddress The address of the Bodhi Token contract.
    function setBodhiTokenAddress(address _tokenAddress) 
        public 
        onlyOwner 
        validAddress(_tokenAddress) 
    {
        BodhiTokenAddressChanged(bodhiTokenAddress, _tokenAddress);
        bodhiTokenAddress = _tokenAddress;
    }

    /// @notice Gets the address of the EventFactory contract.
    /// @param _indexOfAddress The index of the stored EventFactory contract address.
    /// @return The address of the EventFactory contract.
    function getEventFactoryAddress(uint8 _indexOfAddress) 
        public 
        constant 
        returns (address) 
    {
        return eventFactoryAddresses[_indexOfAddress];
    }

    /// @dev Allows the owner to set the address of an EventFactory contract.
    /// @param _indexOfAddress The index to store the EventFactory contract.
    /// @param _newContractAddress The address of the EventFactory contract.
    function setEventFactoryAddress(uint8 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        EventFactoryAddressChanged(_indexOfAddress, eventFactoryAddresses[_indexOfAddress], _newContractAddress);
        eventFactoryAddresses[_indexOfAddress] = _newContractAddress;
    }

    /// @notice Gets the address of the Oracle contract.
    /// @param _indexOfAddress The index of the stored Oracle contract address.
    /// @return The address of Oracle contract.
    function getOracleFactoryAddress(uint8 _indexOfAddress) 
        public 
        constant 
        returns (address) 
    {
        return oracleFactoryAddresses[_indexOfAddress];
    }

    /// @dev Allows the owner to set the address of an Oracle contract.
    /// @param _indexOfAddress The index to store the Oracle contract.
    /// @param _newContractAddress The address of the Oracle contract.
    function setOracleFactoryAddress(uint8 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        OracleFactoryAddressChanged(_indexOfAddress, oracleFactoryAddresses[_indexOfAddress], _newContractAddress);
        oracleFactoryAddresses[_indexOfAddress] = _newContractAddress;
    }
}
