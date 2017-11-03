pragma solidity ^0.4.15;

import "../libs/Ownable.sol";

contract AddressManager is Ownable {
    address public bodhiTokenAddress;
    mapping(uint16 => address) public eventFactoryAddresses;
    mapping(uint16 => address) public oracleFactoryAddresses;
    uint16 public currentEventFactoryIndex = 0;
    uint16 public currentOracleFactoryIndex = 0;

    // Events
    event BodhiTokenAddressChanged(address indexed _oldAddress, address indexed _newAddress);
    event EventFactoryAddressChanged(uint16 _indexOfAddress, address indexed _oldAddress, address indexed _newAddress);
    event OracleFactoryAddressChanged(uint16 _indexOfAddress, address indexed _oldAddress, address indexed _newAddress);

    function AddressManager() public Ownable(msg.sender) {
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

    /// @dev Allows the owner to set the address of an EventFactory contract.
    /// @param _indexOfAddress The index to store the EventFactory contract.
    /// @param _newContractAddress The address of the EventFactory contract.
    function setEventFactoryAddress(uint16 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        if (_indexOfAddress > currentEventFactoryIndex) {
            currentEventFactoryIndex = _indexOfAddress;
        }

        EventFactoryAddressChanged(_indexOfAddress, eventFactoryAddresses[_indexOfAddress], _newContractAddress);
        eventFactoryAddresses[_indexOfAddress] = _newContractAddress;
    }

    /// @dev Allows the owner to set the address of an Oracle contract.
    /// @param _indexOfAddress The index to store the Oracle contract.
    /// @param _newContractAddress The address of the Oracle contract.
    function setOracleFactoryAddress(uint16 _indexOfAddress, address _newContractAddress) 
        public 
        onlyOwner 
        validAddress(_newContractAddress) 
    {
        if (_indexOfAddress > currentOracleFactoryIndex) {
            currentOracleFactoryIndex = _indexOfAddress;
        }

        OracleFactoryAddressChanged(_indexOfAddress, oracleFactoryAddresses[_indexOfAddress], _newContractAddress);
        oracleFactoryAddresses[_indexOfAddress] = _newContractAddress;
    }

    /// @notice Gets the current address of the Bodhi Token contract.
    /// @return The address of Bodhi Token contract.
    function getBodhiTokenAddress() public view returns (address) {
        return bodhiTokenAddress;
    }

    /// @notice Gets the latest index of the EventFactory contract.
    /// @return The index of the latest EventFactory contract.
    function getCurrentEventFactoryIndex() public view returns (uint16) {
        return currentEventFactoryIndex;
    }

    /// @notice Gets the address of the EventFactory contract.
    /// @param _indexOfAddress The index of the stored EventFactory contract address.
    /// @return The address of the EventFactory contract.
    function getEventFactoryAddress(uint16 _indexOfAddress) public view returns (address) {
        return eventFactoryAddresses[_indexOfAddress];
    }

    /// @notice Gets the latest index of the OracleFactory contract.
    /// @return The index of the latest OracleFactory contract.
    function getCurrentOracleFactoryIndex() public view returns (uint16) {
        return currentOracleFactoryIndex;
    }

    /// @notice Gets the address of the Oracle contract.
    /// @param _indexOfAddress The index of the stored Oracle contract address.
    /// @return The address of Oracle contract.
    function getOracleFactoryAddress(uint16 _indexOfAddress) public view returns (address) {
        return oracleFactoryAddresses[_indexOfAddress];
    }
}
