pragma solidity ^0.4.18;

import "./TopicEvent.sol";
import "../storage/IAddressManager.sol";
import "../tokens/ERC20.sol";

/// @title Event Factory allows the creation of individual prediction events.
contract EventFactory {
    using ByteUtils for bytes32;

    uint16 public version;
    address private addressManager;
    uint256 public eventEscrowAmount;
    mapping(bytes32 => TopicEvent) public topics;

    // Events
    event TopicCreated(
        uint16 indexed _version,
        address indexed _topicAddress, 
        bytes32[10] _name, 
        bytes32[11] _resultNames,
        uint8 _numOfResults);

    function EventFactory(address _addressManager) public {
        require(_addressManager != address(0));

        addressManager = _addressManager;
        version = IAddressManager(addressManager).currentEventFactoryIndex();
        eventEscrowAmount = IAddressManager(addressManager).eventEscrowAmount();
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

        transferEscrow(msg.sender);

        TopicEvent topic = new TopicEvent(version, msg.sender, _oracle, _name, resultNames, numOfResults, 
            _bettingStartTime, _bettingEndTime, _resultSettingStartTime, _resultSettingEndTime, addressManager);
        topics[topicHash] = topic;

        TopicCreated(version, address(topic), _name, resultNames, numOfResults);

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

    /*
    * Transfer the escrow amount needed to create an Event.
    * @param _creator The address of the creator.
    */
    function transferEscrow(address _creator)
        private
    {
        ERC20 token = ERC20(addressManager.bodhiTokenAddress());
        require(token.allowance(_creator, addressManager) >= eventEscrowAmount);

        token.transferFrom(_creator, addressManager, eventEscrowAmount);
    }
}
