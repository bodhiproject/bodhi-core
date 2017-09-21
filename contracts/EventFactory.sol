pragma solidity ^0.4.11;

import "./Topic.sol";

/// @title Event Factory contract - allows creation of individual prediction events
contract EventFactory {
    mapping (bytes32 => Topic) public topics;

    // Events
    event TopicCreated(address indexed _creator, Topic _topic, bytes32 _name, bytes32[] _resultNames,
    	uint256 _bettingEndBlock);
    
    function createTopic(bytes32 _name, bytes32[] _resultNames, uint256 _bettingEndBlock)
        public
        returns (Topic tokenAddress) 
    {
    	bytes32 topicHash = getTopicHash(_name, _resultNames, _bettingEndBlock);
    	// Topic should not exist yet
    	require(address(topics[topicHash]) == 0);

    	Topic topic = new Topic(msg.sender, _name, _resultNames, _bettingEndBlock);
    	topics[topicHash] = topic;

    	TopicCreated(msg.sender, topic, _name, _resultNames, _bettingEndBlock);
    	return topic;
    }

    function doesTopicExist(bytes32 _name, bytes32[] _resultNames, uint256 _bettingEndBlock)
        public
        constant
        returns (bool)
    {
        bytes32 topicHash = getTopicHash(_name, _resultNames, _bettingEndBlock);
        return address(topics[topicHash]) != 0;
    }

    function getTopicHash(bytes32 _name, bytes32[] _resultNames, uint256 _bettingEndBlock)
        internal
        constant
        returns (bytes32)
    {
        return keccak256(_name, _resultNames, _bettingEndBlock);
    }
}
