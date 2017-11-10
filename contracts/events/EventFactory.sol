pragma solidity ^0.4.11;

import "../storage/IAddressManager.sol";
import "./TopicEvent.sol";

/// @title Event Factory allows the creation of individual prediction events.
contract EventFactory {
    mapping (bytes32 => TopicEvent) public topics;

    // Events
    event TopicCreated(address indexed _creator, TopicEvent _topicEvent, bytes32[10] _name, bytes32[10] _resultNames,
        uint256 _bettingEndBlock);

    function EventFactory(address _addressManager) public {
        IAddressManager addressManager = IAddressManager(_addressManager);
        addressManager.setEventFactoryAddress(msg.sender, address(this));
    }
    
    function createTopic(
        address _resultSetter, 
        bytes32[10] _name, 
        bytes32[10] _resultNames, 
        uint256 _bettingEndBlock)
        public
        returns (TopicEvent tokenAddress) 
    {
        bytes32 topicHash = getTopicHash(_name, _resultNames, _bettingEndBlock);
        // Topic should not exist yet
        require(address(topics[topicHash]) == 0);

        TopicEvent topic = new TopicEvent(msg.sender, _resultSetter, _name, _resultNames, _bettingEndBlock);
        topics[topicHash] = topic;

        TopicCreated(msg.sender, topic, _name, _resultNames, _bettingEndBlock);
        return topic;
    }

    function doesTopicExist(bytes32[10] _name, bytes32[10] _resultNames, uint256 _bettingEndBlock)
        public
        constant
        returns (bool)
    {
        bytes32 topicHash = getTopicHash(_name, _resultNames, _bettingEndBlock);
        return address(topics[topicHash]) != 0;
    }

    function getTopicHash(bytes32[10] _name, bytes32[10] _resultNames, uint256 _bettingEndBlock)
        internal
        pure    
        returns (bytes32)
    {
        return keccak256(_name, _resultNames, _bettingEndBlock);
    }
}
