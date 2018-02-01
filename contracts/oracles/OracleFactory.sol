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
        uint16 indexed _version, 
        address indexed _contractAddress, 
        address indexed _eventAddress, 
        uint8 _numOfResults,
        address _oracle,
        uint256 _bettingStartTime,
        uint256 _bettingEndTime,
        uint256 _resultSettingStartTime,
        uint256 _resultSettingEndTime,
        uint256 _consensusThreshold);
    event DecentralizedOracleCreated(
        uint16 indexed _version, 
        address indexed _contractAddress, 
        address indexed _eventAddress, 
        uint8 _numOfResults, 
        uint8 _lastResultIndex, 
        uint256 _arbitrationEndTime, 
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
        address _eventAddress,
        uint8 _numOfResults,
        address _oracle,
        uint256 _bettingStartTime,
        uint256 _bettingEndTime,
        uint256 _resultSettingStartTime,
        uint256 _resultSettingEndTime,
        uint256 _consensusThreshold) 
        public
        returns (address)
    {
        bytes32 hash = getCentralizedOracleHash(_eventAddress, _numOfResults, _oracle, _bettingStartTime, 
            _bettingEndTime, _resultSettingStartTime, _resultSettingEndTime, _consensusThreshold);
        // CentralizedOracle should not exist yet
        require(oracles[hash] == address(0));

        CentralizedOracle cOracle = new CentralizedOracle(version, msg.sender, _eventAddress, _numOfResults, _oracle, 
            _bettingStartTime, _bettingEndTime, _resultSettingStartTime, _resultSettingEndTime, _consensusThreshold);
        oracles[hash] = address(cOracle);

        CentralizedOracleCreated(version, address(cOracle), _eventAddress, _numOfResults, _oracle, _bettingStartTime, 
            _bettingEndTime, _resultSettingStartTime, _resultSettingEndTime, _consensusThreshold);

        return address(cOracle);
    }

    function createDecentralizedOracle(
        address _eventAddress,
        uint8 _numOfResults,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndTime,
        uint256 _consensusThreshold)
        public
        returns (address)
    {
        bytes32 hash = getDecentralizedOracleHash(_eventAddress, _numOfResults, _lastResultIndex, _arbitrationEndTime, 
            _consensusThreshold);
        // DecentralizedOracle should not exist yet
        require(oracles[hash] == address(0));

        DecentralizedOracle dOracle = new DecentralizedOracle(version, msg.sender, _eventAddress, _numOfResults, 
            _lastResultIndex, _arbitrationEndTime, _consensusThreshold);
        oracles[hash] = address(dOracle);

        DecentralizedOracleCreated(version, address(dOracle), _eventAddress, _numOfResults, _lastResultIndex, 
            _arbitrationEndTime, _consensusThreshold);

        return address(dOracle);
    }

    function getCentralizedOracleHash(
        address _eventAddress,
        uint8 _numOfResults,
        address _oracle,
        uint256 _bettingStartTime,
        uint256 _bettingEndTime,
        uint256 _resultSettingStartTime,
        uint256 _resultSettingEndTime,
        uint256 _consensusThreshold) 
        private
        pure
        returns (bytes32)
    {
        return keccak256(_eventAddress, _numOfResults, _oracle, _bettingStartTime, _bettingEndTime, 
            _resultSettingStartTime, _resultSettingEndTime, _consensusThreshold);
    }

    function getDecentralizedOracleHash(
        address _eventAddress,
        uint8 _numOfResults,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndTime,
        uint256 _consensusThreshold) 
        private
        pure
        returns (bytes32)
    {
        return keccak256(_eventAddress, _numOfResults, _lastResultIndex, _arbitrationEndTime, _consensusThreshold);
    }
}
