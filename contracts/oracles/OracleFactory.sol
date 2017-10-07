pragma solidity ^0.4.4;

import "./Oracle.sol";

contract OracleFactory {
    mapping (bytes32 => Oracle) public oracles;

    // Events
    event OracleCreated(address indexed _creator, Oracle _oracle, bytes _eventName, bytes32[] _eventResultNames, 
        uint256 _eventBettingEndBlock, uint256 _decisionEndBlock, uint256 _arbitrationOptionEndBlock, 
        uint256 _baseRewardAmount);

    function createOracle(
        bytes _eventName, 
        bytes32[] _eventResultNames,
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock)
        public
        payable
        returns (Oracle oracleAddress)
    {
        bytes32 topicHash = getTopicHash(_name, _resultNames, _bettingEndBlock);
        // Oracle should not exist yet
        require(address(topics[topicHash]) == 0);

        TopicEvent topic = new TopicEvent(msg.sender, _resultSetter, _name, _resultNames, _bettingEndBlock);
        topics[topicHash] = topic;

        OracleCreated(msg.sender, topic, _name, _resultNames, _bettingEndBlock);
        return topic;
    }
}
