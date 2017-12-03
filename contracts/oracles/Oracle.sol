pragma solidity ^0.4.18;

import "../events/ITopicEvent.sol";
import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";
import "../libs/ByteUtils.sol";

contract Oracle is Ownable {
    using ByteUtils for bytes32;
    using SafeMath for uint256;

    struct ResultBalance {
        uint256 total;
        mapping(address => uint256) balances;
    }

    uint8 public constant type;

    bool public isFinished;
    uint8 public numOfResults;
    bytes32[10] internal eventName;
    bytes32[10] internal eventResultNames;
    address public eventAddress;
    uint256 public consensusThreshold;
    uint256 public currentBalance;
    ResultBalance[10] internal resultBalances;

    // Events
    event OracleResultVoted(address indexed _participant, uint8 _resultIndex, uint256 _votedAmount);
    event OracleResultSet(uint8 _oracleType, uint8 _resultIndex);

    // Modifiers
    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }

    modifier isNotFinished() {
        require(!isFinished);
        _;
    }

    /*
    * @notice Gets the Event name as a string.
    * @return The name of the Event.
    */
    function getEventName() 
        public 
        view 
        returns (string) 
    {
        return ByteUtils.toString(eventName);
    }

    /*
    * @notice Gets the Event result names as an array of strings.
    * @return An array of result name strings.
    */
    function getEventResultName(uint8 _eventResultIndex) 
        public 
        view 
        validResultIndex(_eventResultIndex)
        returns (string) 
    {
        return ByteUtils.toString(eventResultNames[_eventResultIndex]);
    }

    /*
    * @notice Gets the amount voted by the Oracle participant given the Event result index.
    * @return The amount voted.
    */
    function getVotedBalance(uint8 _eventResultIndex) 
        public 
        view 
        validResultIndex(_eventResultIndex)
        returns (uint256)
    {
        return resultBalances[_eventResultIndex].voteBalances[msg.sender];
    }

    function getFinalResultIndex() public view returns (uint8);
}
