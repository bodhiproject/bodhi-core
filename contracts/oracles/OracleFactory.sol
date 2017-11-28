pragma solidity ^0.4.18;

import "./IOracleFactory.sol";
import "./Oracle.sol";
import "../storage/IAddressManager.sol";

contract OracleFactory is IOracleFactory {
    address private addressManager;
    mapping (bytes32 => Oracle) public oracles;

    // Events
    event OracleCreated(address indexed _creator, address indexed _oracleAddress, bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, uint256 _eventBettingEndBlock, uint256 _decisionEndBlock, 
        uint256 _arbitrationOptionEndBlock, uint256 _baseRewardAmount);

    /// @notice Creates new OracleFactory contract.
    /// @param _addressManager The address of the AddressManager contract.
    function OracleFactory(address _addressManager) public {
        require(_addressManager != address(0));
        addressManager = _addressManager;
        IAddressManager addressManagerInterface = IAddressManager(addressManager);
        addressManagerInterface.setOracleFactoryAddress(msg.sender, address(this));
    }

    /// @notice Creates new Oracle contract.
    /// @param _eventName The name of the Event this Oracle will arbitrate.
    /// @param _eventResultNames The result options of the Event.
    /// @param _eventBettingEndBlock The block when Event betting ended.
    /// @param _decisionEndBlock The block when Oracle voting will end.
    /// @param _arbitrationOptionEndBlock The block when the option to start an arbitration will end.
    function createOracle(
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock)
        public
        payable
        returns (address)
    {
        bytes32 oracleHash = getOracleHash(_eventName, _eventResultNames, _eventBettingEndBlock, 
            _decisionEndBlock, _arbitrationOptionEndBlock);
        // Oracle should not exist yet
        require(address(oracles[oracleHash]) == 0);

        Oracle oracle = new Oracle(msg.sender, _eventName, _eventResultNames, _eventBettingEndBlock, _decisionEndBlock, 
            _arbitrationOptionEndBlock, addressManager);
        oracle.addBaseReward.value(msg.value)();
        oracles[oracleHash] = oracle;
        OracleCreated(msg.sender, address(oracle), _eventName, _eventResultNames, _eventBettingEndBlock, 
            _decisionEndBlock, _arbitrationOptionEndBlock, msg.value);

        return address(oracle);
    }

    /// @notice Returns if the Oracle has already been created for a specific Event.
    /// @param _eventName The name of the Event this Oracle will arbitrate.
    /// @param _eventResultNames The result options of the Event.
    /// @param _eventBettingEndBlock The block when Event betting ended.
    /// @param _decisionEndBlock The block when Oracle voting will end.
    /// @param _arbitrationOptionEndBlock The block when the option to start an arbitration will end.
    function doesOracleExist(
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock)
        public
        constant
        returns (bool)
    {
        bytes32 oracleHash = getOracleHash(_eventName, _eventResultNames, _eventBettingEndBlock, 
            _decisionEndBlock, _arbitrationOptionEndBlock);
        return address(oracles[oracleHash]) != 0;
    }

    /// @dev Gets the Oracle hash given the inputs.
    /// @param _eventName The name of the Event this Oracle will arbitrate.
    /// @param _eventResultNames The result options of the Event.
    /// @param _eventBettingEndBlock The block when Event betting ended.
    /// @param _decisionEndBlock The block when Oracle voting will end.
    /// @param _arbitrationOptionEndBlock The block when the option to start an arbitration will end.
    function getOracleHash(
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames,
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock) 
        internal
        pure
        returns (bytes32)
    {
        return keccak256(_eventName, _eventResultNames, _eventBettingEndBlock, _decisionEndBlock, 
            _arbitrationOptionEndBlock);
    }
}
