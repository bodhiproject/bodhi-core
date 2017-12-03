pragma solidity ^0.4.18;

import "./IOracleFactory.sol";
import "./CentralizedOracle.sol";
import "./DecentralizedOracle.sol";
import "../storage/IAddressManager.sol";

contract OracleFactory is IOracleFactory {
    address private addressManager;
    mapping(bytes32 => address) public oracles;

    // Events
    event OracleCreated(address indexed _creator, address indexed _oracleAddress, address indexed _eventAddress,
        bytes32[10] _eventName, bytes32[10] _eventResultNames, uint8 _numOfResults, uint8 _lastResultIndex, 
        uint256 _arbitrationEndBlock, uint256 _consensusThreshold);

    /*
    * @notice Creates new OracleFactory contract.
    * @param _addressManager The address of the AddressManager contract.
    */
    function OracleFactory(address _addressManager) public {
        require(_addressManager != address(0));
        addressManager = _addressManager;
        IAddressManager addressManagerInterface = IAddressManager(addressManager);
        addressManagerInterface.setOracleFactoryAddress(msg.sender, address(this));
    }

    function createCentralizedOracle(
        address _oracle,
        address _eventAddress,
        bytes32[10] _eventName,
        bytes32[10] _eventResultNames,
        uint8 _numOfResults,
        uint256 _bettingEndBlock,
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold) 
        public
        returns (address)
    {
        bytes32 oracleHash = getCentralizedOracleHash(_oracle, _eventAddress, _eventName, _eventResultNames, 
            _numOfResults, _bettingEndBlock, _resultSettingEndBlock, _consensusThreshold);
        // CentralizedOracle should not exist yet
        require(oracles[oracleHash] == address(0));

        CentralizedOracle oracle = new CentralizedOracle(msg.sender, _oracle, _eventAddress, _eventName, 
            _eventResultNames, _numOfResults, _bettingEndBlock, _resultSettingEndBlock, _consensusThreshold);
        oracles[oracleHash] = address(oracle);

        // TODO: different event for CentralizedOracle?
        // OracleCreated(msg.sender, address(oracle), _eventAddress, _eventName, _eventResultNames, _numOfResults, 
        //     _lastResultIndex, _arbitrationEndBlock, _consensusThreshold);

        return address(oracle);
    }

    function createDecentralizedOracle(
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold)
        public
        returns (address)
    {
        bytes32 oracleHash = getDecentralizedOracleHash(_eventAddress, _eventName, _eventResultNames, _numOfResults, 
            _lastResultIndex, _arbitrationEndBlock, _consensusThreshold);
        // DecentralizedOracle should not exist yet
        require(oracles[oracleHash] == address(0));

        DecentralizedOracle oracle = new DecentralizedOracle(msg.sender, _eventAddress, _eventName, _eventResultNames, 
            _numOfResults, _lastResultIndex, _arbitrationEndBlock, _consensusThreshold);
        oracles[oracleHash] = address(oracle);

        OracleCreated(msg.sender, address(oracle), _eventAddress, _eventName, _eventResultNames, _numOfResults, 
            _lastResultIndex, _arbitrationEndBlock, _consensusThreshold);

        return address(oracle);
    }

    function doesCentralizedOracleExist(
        address _oracle,
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults,
        uint256 _bettingEndBlock,
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold)
        public
        view
        returns (bool)
    {
        bytes32 oracleHash = getCentralizedOracleHash(_oracle, _eventAddress, _eventName, _eventResultNames, 
            _numOfResults, _bettingEndBlock, _resultSettingEndBlock, _consensusThreshold);
        return oracles[oracleHash] != address(0);
    }

    function doesDecentralizedOracleExist(
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold)
        public
        view
        returns (bool)
    {
        bytes32 oracleHash = getDecentralizedOracleHash(_eventAddress, _eventName, _eventResultNames, _numOfResults, 
            _lastResultIndex, _arbitrationEndBlock, _consensusThreshold);
        return oracles[oracleHash] != address(0);
    }

    function getCentralizedOracleHash(
        address _oracle,
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults,
        uint256 _bettingEndBlock,
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold) 
        private
        pure
        returns (bytes32)
    {
        return keccak256(_oracle, _eventAddress, _eventName, _eventResultNames, _numOfResults, _bettingEndBlock, 
            _resultSettingEndBlock, _consensusThreshold);
    }

    function getDecentralizedOracleHash(
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold) 
        private
        pure
        returns (bytes32)
    {
        return keccak256(_eventAddress, _eventName, _eventResultNames, _numOfResults, _lastResultIndex, 
            _arbitrationEndBlock, _consensusThreshold);
    }
}
