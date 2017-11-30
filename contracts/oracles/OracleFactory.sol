pragma solidity ^0.4.18;

import "./IOracleFactory.sol";
import "./Oracle.sol";
import "../storage/IAddressManager.sol";

contract OracleFactory is IOracleFactory {
    address private addressManager;
    mapping(bytes32 => Oracle) public oracles;

    // Events
    event OracleCreated(address indexed _creator, address indexed _oracleAddress, address indexed _eventAddress,
        bytes32[10] _eventName, bytes32[10] _eventResultNames, uint8 _lastResultIndex, uint256 _arbitrationEndBlock, 
        uint256 _consensusThreshold);

    /// @notice Creates new OracleFactory contract.
    /// @param _addressManager The address of the AddressManager contract.
    function OracleFactory(address _addressManager) public {
        require(_addressManager != address(0));
        addressManager = _addressManager;
        IAddressManager addressManagerInterface = IAddressManager(addressManager);
        addressManagerInterface.setOracleFactoryAddress(msg.sender, address(this));
    }

    function createOracle(
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold)
        public
        returns (address)
    {
        bytes32 oracleHash = getOracleHash(_eventAddress, _eventName, _eventResultNames, _lastResultIndex, 
            _arbitrationEndBlock, _consensusThreshold);
        // Oracle should not exist yet
        require(address(oracles[oracleHash]) == 0);

        Oracle oracle = new Oracle(msg.sender, _eventAddress, _eventName, _eventResultNames, _lastResultIndex, 
            _arbitrationEndBlock, _consensusThreshold);
        oracles[oracleHash] = oracle;

        OracleCreated(msg.sender, address(oracle), _eventAddress, _eventName, _eventResultNames, _lastResultIndex, 
            _arbitrationEndBlock, _consensusThreshold);

        return address(oracle);
    }

    function doesOracleExist(
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold)
        public
        constant
        returns (bool)
    {
        bytes32 oracleHash = getOracleHash(_eventAddress, _eventName, _eventResultNames, _lastResultIndex, 
            _arbitrationEndBlock, _consensusThreshold);
        return address(oracles[oracleHash]) != 0;
    }

    function getOracleHash(
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold) 
        internal
        pure
        returns (bytes32)
    {
        return keccak256(_eventAddress, _eventName, _eventResultNames, _lastResultIndex, _arbitrationEndBlock, 
            _consensusThreshold);
    }
}
