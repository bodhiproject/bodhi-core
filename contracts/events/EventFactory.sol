pragma solidity ^0.4.18;

import "./TopicEvent.sol";
import "../storage/IAddressManager.sol";

/// @title Event Factory allows the creation of individual prediction events.
contract EventFactory {
    using ByteUtils for bytes32;

    uint16 public version;
    address private addressManager;
    mapping(bytes32 => TopicEvent) public topics;

    // Events
    event TopicCreated(
        uint16 indexed _version,
        address indexed _topicAddress, 
        address indexed _creatorAddress,
        bytes32[10] _name, 
        bytes32[11] _resultNames,
        uint8 _numOfResults,
        uint256 _escrowAmount);

    function EventFactory(address _addressManager) public {
        require(_addressManager != address(0));

        addressManager = _addressManager;
        version = IAddressManager(addressManager).currentEventFactoryIndex();
    }
    
    function createTopic(
        address _oracle, 
        bytes32[10] _name, 
        bytes32[10] _resultNames, 
        uint256 _bettingStartTime,
        uint256 _bettingEndTime,
        uint256 _resultSettingStartTime,
        uint256 _resultSettingEndTime)
        public
        returns (TopicEvent topicEvent) 
    {
        require(!_name[0].isEmpty());
        require(!_resultNames[0].isEmpty());
        require(!_resultNames[1].isEmpty());
        
        bytes32[11] memory resultNames;
        uint8 numOfResults;

        resultNames[0] = "Invalid";
        numOfResults++;

        for (uint i = 0; i < _resultNames.length; i++) {
            if (!_resultNames[i].isEmpty()) {
                resultNames[i + 1] = _resultNames[i];
                numOfResults++;
            } else {
                break;
            }
        }

        bytes32 topicHash = getTopicHash(_name, resultNames, numOfResults, _bettingStartTime, _bettingEndTime, 
            _resultSettingStartTime, _resultSettingEndTime);
        // Topic should not exist yet
        require(address(topics[topicHash]) == 0);

        IAddressManager(addressManager).transferEscrow(msg.sender);

        TopicEvent topic = new TopicEvent(version, msg.sender, _oracle, _name, resultNames, numOfResults, 
            _bettingStartTime, _bettingEndTime, _resultSettingStartTime, _resultSettingEndTime, addressManager);
        topics[topicHash] = topic;

        IAddressManager(addressManager).addWhitelistContract(address(topic));

        TopicCreated(version, address(topic), msg.sender, _name, resultNames, numOfResults,
            IAddressManager(addressManager).eventEscrowAmount());

        return topic;
    }

    function getTopicHash(
        bytes32[10] _name, 
        bytes32[11] _resultNames, 
        uint8 _numOfResults,
        uint256 _bettingStartTime,
        uint256 _bettingEndTime,
        uint256 _resultSettingStartTime,
        uint256 _resultSettingEndTime)
        internal
        pure    
        returns (bytes32)
    {
        return keccak256(_name, _resultNames, _numOfResults, _bettingStartTime, _bettingEndTime, 
            _resultSettingStartTime, _resultSettingEndTime);
    }
}
