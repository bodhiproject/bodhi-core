pragma solidity ^0.4.18;

import "../BaseContract.sol";
import "../events/ITopicEvent.sol";
import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";

contract Oracle is BaseContract, Ownable {
    using SafeMath for uint256;

    bytes32 internal constant QTUM = "QTUM";
    bytes32 internal constant BOT = "BOT";

    bool public finished;
    address public eventAddress;
    uint256 public consensusThreshold;

    // Events
    event OracleResultVoted(
        uint16 indexed _version, 
        address indexed _oracleAddress, 
        address indexed _participant, 
        uint8 _resultIndex, 
        uint256 _votedAmount,
        bytes32 _token);
    event OracleResultSet(
        uint16 indexed _version, 
        address indexed _oracleAddress, 
        uint8 _resultIndex);

    // Modifiers
    modifier isNotFinished() {
        require(!finished);
        _;
    }
}
