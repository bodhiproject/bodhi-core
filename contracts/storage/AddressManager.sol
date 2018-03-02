pragma solidity ^0.4.18;

import "./IAddressManager.sol";
import "../libs/Ownable.sol";

contract AddressManager is IAddressManager, Ownable {
    uint256 public constant botDecimals = 8; // Number of decimals for BOT

    uint16 public currentEventFactoryIndex = 0; // Index of the next upgraded EventFactory contract
    uint16 public currentOracleFactoryIndex = 0; // Index of the next upgraded OracleFactory contract
    uint256 public arbitrationLength = 86400; // Number of seconds for arbitration period
    uint256 public startingOracleThreshold = 100 * (10**botDecimals); // Consensus threshold for CentralizedOracles
    uint256 public consensusThresholdIncrement = 10 * (10**botDecimals); // Amount to increment from previous threshold
    mapping(address => uint16) public eventFactoryAddressToVersion;
    mapping(address => uint16) public oracleFactoryAddressToVersion;

    // Events
    event BodhiTokenAddressChanged(address indexed _newAddress);
    event EventFactoryAddressAdded(uint16 _index, address indexed _contractAddress);
    event OracleFactoryAddressAdded(uint16 _index, address indexed _contractAddress);

    function AddressManager() Ownable(msg.sender) public {
    }

    /// @dev Allows the owner to set the address of the Bodhi Token contract.
    /// @param _tokenAddress The address of the Bodhi Token contract.
    function setBodhiTokenAddress(address _tokenAddress) 
        public 
        onlyOwner()
        validAddress(_tokenAddress) 
    {
        bodhiTokenAddress = _tokenAddress;

        BodhiTokenAddressChanged(bodhiTokenAddress);
    }

    /// @dev Allows the owner to set the address of an EventFactory contract.
    /// @param _contractAddress The address of the EventFactory contract.
    function setEventFactoryAddress(address _contractAddress) 
        public 
        onlyOwner()
        validAddress(_contractAddress)
    {
        uint16 index = currentEventFactoryIndex;
        eventFactoryVersionToAddress[index] = _contractAddress;
        eventFactoryAddressToVersion[_contractAddress] = index;
        currentEventFactoryIndex++;

        EventFactoryAddressAdded(index, _contractAddress);
    }

    /// @dev Allows the owner to set the address of an OracleFactory contract.
    /// @param _contractAddress The address of the OracleFactory contract.
    function setOracleFactoryAddress(address _contractAddress) 
        public 
        onlyOwner()
        validAddress(_contractAddress) 
    {
        uint16 index = currentOracleFactoryIndex;
        oracleFactoryVersionToAddress[index] = _contractAddress;
        oracleFactoryAddressToVersion[_contractAddress] = index;
        currentOracleFactoryIndex++;

        OracleFactoryAddressAdded(index, _contractAddress);
    }

    /*
    * @dev Sets the arbitrationLength that DecentralizedOracles will use.
    * @param _newLength The new length in seconds (unix time) of an arbitration period.
    */
    function setArbitrationLength(uint256 _newLength) 
        public
        onlyOwner()
    {   
        require(_newLength > 0);

        arbitrationLength = _newLength;
    }

    /*
    * @dev Sets the startingOracleThreshold that CentralizedOracles will use.
    * @param _newThreshold The new consensusThreshold for CentralizedOracles.
    */
    function setStartingOracleThreshold(uint256 _newThreshold) 
        public
        onlyOwner()
    {   
        startingOracleThreshold = _newThreshold;
    }

    /*
    * @dev Sets the consensusThresholdIncrement that DecentralizedOracles will use.
    * @param _newIncrement The new increment amount for DecentralizedOracles.
    */
    function setConsensusThresholdIncrement(uint256 _newIncrement) 
        public
        onlyOwner()
    {   
        consensusThresholdIncrement = _newIncrement;
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
}
