pragma solidity ^0.4.15;

import "./IAddressManager.sol";
import "../libs/Ownable.sol";

contract AddressManager is IAddressManager, Ownable {
    uint256 public constant botDecimals = 8; // Number of decimals for BOT

    uint16 public arbitrationBlockLength = 100; // Amount of blocks for a VotingOracle arbitration.
    uint16 private currentEventFactoryIndex = 0; // Index of the next upgraded EventFactory contract
    uint16 private currentOracleFactoryIndex = 0; // Index of the next upgraded OracleFactory contract
    uint256 public startingOracleThreshold = 100 * (10**botDecimals);
    uint256 public consensusThresholdIncrement = 10 * (10**botDecimals);
    mapping(uint16 => address) private eventFactoryAddresses;
    mapping(uint16 => address) private oracleFactoryAddresses;

    // Events
    event BodhiTokenAddressChanged(address indexed _oldAddress, address indexed _newAddress);
    event EventFactoryAddressAdded(uint16 _index, address indexed _contractAddress);
    event OracleFactoryAddressAdded(uint16 _index, address indexed _contractAddress);

    function AddressManager() Ownable(msg.sender) public {
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
    /// @param _sender This should be the msg.sender of the EventFactory instantiation call.
    /// @param _contractAddress The address of the EventFactory contract.
    function setEventFactoryAddress(address _sender, address _contractAddress) 
        public 
        validAddress(_contractAddress) 
    {
        require(_sender == owner);
        eventFactoryAddresses[currentEventFactoryIndex] = _contractAddress;
        EventFactoryAddressAdded(currentEventFactoryIndex, _contractAddress);
        currentEventFactoryIndex++;
    }

    /// @dev Allows the owner to set the address of an OracleFactory contract.
    /// @param _sender This should be the msg.sender of the OracleFactory instantiation call.
    /// @param _contractAddress The address of the OracleFactory contract.
    function setOracleFactoryAddress(address _sender, address _contractAddress) 
        public 
        validAddress(_contractAddress) 
    {
        require(_sender == owner);
        oracleFactoryAddresses[currentOracleFactoryIndex] = _contractAddress;
        OracleFactoryAddressAdded(currentOracleFactoryIndex, _contractAddress);
        currentOracleFactoryIndex++;
    }

    /// @notice Gets the latest index of a deployed EventFactory contract.
    /// @return The index of the latest deployed EventFactory contract.
    function getLastEventFactoryIndex() 
        public 
        view 
        returns (uint16) 
    {
        if (currentEventFactoryIndex == 0) {
            return 0;
        } else {
            return currentEventFactoryIndex - 1;
        }
    }

    /// @notice Gets the address of the EventFactory contract.
    /// @param _indexOfAddress The index of the stored EventFactory contract address.
    /// @return The address of the EventFactory contract.
    function getEventFactoryAddress(uint16 _indexOfAddress) 
        public 
        view 
        returns (address) 
    {
        return eventFactoryAddresses[_indexOfAddress];
    }

    /// @notice Gets the latest index of a deployed OracleFactory contract.
    /// @return The index of the latest deployed OracleFactory contract.
    function getLastOracleFactoryIndex() 
        public 
        view 
        returns (uint16) 
    {
        if (currentOracleFactoryIndex == 0) {
            return 0;
        } else {
            return currentOracleFactoryIndex - 1;
        }
    }

    /// @notice Gets the address of the OracleFactory contract.
    /// @param _indexOfAddress The index of the stored OracleFactory contract address.
    /// @return The address of OracleFactory contract.
    function getOracleFactoryAddress(uint16 _indexOfAddress) 
        public 
        view 
        returns (address) 
    {
        return oracleFactoryAddresses[_indexOfAddress];
    }
}
