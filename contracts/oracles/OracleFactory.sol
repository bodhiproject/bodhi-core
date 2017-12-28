pragma solidity ^0.4.18;

import "./IOracleFactory.sol";
import "./CentralizedOracle.sol";
import "./DecentralizedOracle.sol";
import "../storage/IAddressManager.sol";

contract OracleFactory is IOracleFactory {
    uint16 public version;
    address private addressManager;
    mapping(bytes32 => address) public oracles;

    // Events
    event CentralizedOracleCreated(
        address indexed _contractAddress, 
        address indexed _oracle, 
        address indexed _eventAddress, 
        bytes32[10] _name, 
        bytes32[10] _resultNames, 
        uint8 _numOfResults,
        uint256 _bettingStartBlock, 
        uint256 _bettingEndBlock, 
        uint256 _resultSettingStartBlock,
        uint256 _resultSettingEndBlock, 
        uint256 _consensusThreshold);
    event DecentralizedOracleCreated(
        uint16 indexed _version, 
        address indexed _contractAddress, 
        address indexed _eventAddress, 
        bytes32[10] _name, 
        bytes32[10] _resultNames, 
        uint8 _numOfResults, 
        uint8 _lastResultIndex, 
        uint256 _arbitrationEndBlock, 
        uint256 _consensusThreshold);

    /*
    * @notice Creates new OracleFactory contract.
    * @param _addressManager The address of the AddressManager contract.
    */
    function OracleFactory(address _addressManager) public {
        require(_addressManager != address(0));

        addressManager = _addressManager;
        version = IAddressManager(addressManager).currentOracleFactoryIndex();
    }

    function createCentralizedOracle(
        address _oracle,
        address _eventAddress,
        bytes32[10] _eventName,
        bytes32[10] _eventResultNames,
        uint8 _numOfResults,
        uint256 _bettingStartBlock,
        uint256 _bettingEndBlock,
        uint256 _resultSettingStartBlock,
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold) 
        public
        returns (address)
    {
        bytes32 oracleHash = getCentralizedOracleHash(_oracle, _eventAddress, _eventName, _eventResultNames, 
            _numOfResults, _bettingStartBlock, _bettingEndBlock, _resultSettingStartBlock, _resultSettingEndBlock, 
            _consensusThreshold);
        // CentralizedOracle should not exist yet
        require(oracles[oracleHash] == address(0));

        CentralizedOracle oracle = new CentralizedOracle(version, msg.sender, _oracle, _eventAddress, _eventName, 
            _eventResultNames, _numOfResults, _bettingStartBlock, _bettingEndBlock, _resultSettingStartBlock, 
            _resultSettingEndBlock, _consensusThreshold);
        oracles[oracleHash] = address(oracle);

        CentralizedOracleCreated(address(oracle), _oracle, _eventAddress, _eventName, _eventResultNames, _numOfResults, 
            _bettingStartBlock, _bettingEndBlock, _resultSettingStartBlock, _resultSettingEndBlock, _consensusThreshold);

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

        DecentralizedOracle oracle = new DecentralizedOracle(version, msg.sender, _eventAddress, _eventName, 
            _eventResultNames, _numOfResults, _lastResultIndex, _arbitrationEndBlock, _consensusThreshold);
        oracles[oracleHash] = address(oracle);

        DecentralizedOracleCreated(version, address(oracle), _eventAddress, _eventName, _eventResultNames,
             _numOfResults, _lastResultIndex, _arbitrationEndBlock, _consensusThreshold);

        return address(oracle);
    }

    function getCentralizedOracleHash(
        address _oracle,
        address _eventAddress,
        bytes32[10] _eventName, 
        bytes32[10] _eventResultNames, 
        uint8 _numOfResults,
        uint256 _bettingStartBlock,
        uint256 _bettingEndBlock,
        uint256 _resultSettingStartBlock,
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold) 
        private
        pure
        returns (bytes32)
    {
        return keccak256(_oracle, _eventAddress, _eventName, _eventResultNames, _numOfResults, _bettingStartBlock, 
            _bettingEndBlock, _resultSettingStartBlock, _resultSettingEndBlock, _consensusThreshold);
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
