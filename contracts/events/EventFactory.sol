pragma solidity ^0.4.11;

import "../storage/IAddressManager.sol";
import "./TopicEvent.sol";

/// @title Event Factory allows the creation of individual prediction events.
contract EventFactory {
    mapping (bytes32 => TopicEvent) public topics;

    // Events
    event TopicCreated(address indexed _topicAddress, address indexed _creator, address indexed _oracle,
        bytes32[10] _name, bytes32[10] _resultNames, uint256 _bettingEndBlock, uint256 _arbitrationOptionEndBlock);

    function EventFactory(address _addressManager) public {
        require(_addressManager != address(0));
        IAddressManager addressManager = IAddressManager(_addressManager);
        addressManager.setEventFactoryAddress(msg.sender, address(this));
    }
    
    function createTopic(
        address _oracle, 
        bytes32[10] _name, 
        bytes32[10] _resultNames, 
        uint256 _bettingEndBlock,
        uint256 _arbitrationOptionEndBlock)
        public
        returns (TopicEvent tokenAddress) 
    {
        bytes32 topicHash = getTopicHash(_name, _resultNames, _bettingEndBlock, _arbitrationOptionEndBlock);
        // Topic should not exist yet
        require(address(topics[topicHash]) == 0);

        TopicEvent topic = new TopicEvent(msg.sender, _oracle, _name, _resultNames, _bettingEndBlock, 
            _arbitrationOptionEndBlock);
        topics[topicHash] = topic;
        TopicCreated(address(topic), msg.sender, _oracle, _name, _resultNames, _bettingEndBlock, 
            _arbitrationOptionEndBlock);

        return topic;
    }

    function doesTopicExist(bytes32[10] _name, bytes32[10] _resultNames, uint256 _bettingEndBlock, 
        uint256 _arbitrationOptionEndBlock)
        public
        constant
        returns (bool)
    {
        bytes32 topicHash = getTopicHash(_name, _resultNames, _bettingEndBlock, _arbitrationOptionEndBlock);
        return address(topics[topicHash]) != 0;
    }

    function getTopicHash(bytes32[10] _name, bytes32[10] _resultNames, uint256 _bettingEndBlock, 
        uint256 _arbitrationOptionEndBlock)
        internal
        pure    
        returns (bytes32)
    {
        return keccak256(_name, _resultNames, _bettingEndBlock, _arbitrationOptionEndBlock);
    }
}
