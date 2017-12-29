pragma solidity ^0.4.18;

contract BaseContract {
    struct ResultBalance {
        uint256 totalBets;
        uint256 totalVotes;
        mapping(address => uint256) bets;
        mapping(address => uint256) votes;
    }

    uint8 public constant INVALID_RESULT_INDEX = 255;

    uint8 public numOfResults;
    uint8 public resultIndex = INVALID_RESULT_INDEX;
    uint16 public version;
    ResultBalance[11] internal balances;

    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }
}
