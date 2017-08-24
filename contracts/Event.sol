pragma solidity ^0.4.4;

import "./SafeMath.sol";

contract Event is SafeMath {
    struct Result {
        bytes32 name;
        uint256 balance;
        mapping (address => uint256) betBalances;
    }

    address owner;
    bytes32 name;
    Result[] public results;
    uint256 public bettingEndBlock;
    int finalResultOrder = int(-1);

    event FinalResultSet(uint finalResultOrder);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier validResultOrder(uint resultOrder) {
        require(resultOrder >= 0);
        require(resultOrder <= results.length - 1);
        _;
    }

    modifier hasNotEnded() {
        require(block.number < bettingEndBlock);
        _;
    }

    modifier hasEnded() {
        require(block.number >= bettingEndBlock);
        _;
    }

    modifier finalResultNotSet() {
        require(finalResultOrder == -1);
        _;
    }

    modifier finalResultSet() {
        require(finalResultOrder != -1);
        _;
    }

    function Event(bytes32 _name, bytes32[] resultNames, uint256 _bettingEndBlock) {
        owner = msg.sender;
        name = _name;

        // Cannot have a prediction event with only 1 result
        require(resultNames.length > 1);

        for (uint i = 0; i < resultNames.length; i++) {
            results.push(Result({
                name: resultNames[i],
                balance: 0
            }));
        }

        bettingEndBlock = _bettingEndBlock;
    }

    function getResultName(uint resultOrder) public validResultOrder constant returns (bytes32) {
        return results[resultOrder].name;
    }

    function bet(uint resultOrder) public hasNotEnded payable {
        Result storage result = results[resultOrder];
        result.balance = safeAdd(result.balance, msg.value);
        result.betBalances[msg.sender] = safeAdd(result.betBalances[msg.sender], msg.value);
    }

    function withdrawBet() public finalResultSet {
        uint256 totalEventBalance = 0;
        for (uint i = 0; i < results.length; i++) {
            totalEventBalance = safeAdd(results[i].balance, totalEventBalance);
        }
        require(totalEventBalance > 0);

        Result storage finalResult = results[resultOrder];
        uint256 betBalance = finalResult.betBalances[msg.sender];
        require(betBalance > 0);

        finalResult.betBalances[msg.sender] = 0;
        uint256 withdrawAmount = totalEventBalance * betBalance / finalResult.balance;
        msg.sender.transfer(withdrawAmount);
    }

    function revealResult(uint resultOrder)
        public
        onlyOwner
        hasEnded
        validResultOrder(resultOrder)
        finalResultNotSet
    {
        finalResultOrder = resultOrder;
        FinalResultSet(finalResultOrder);
    }

    function getFinalResultOrder() public finalResultSet constant returns (uint) {
        return finalResultOrder;
    }

    function getFinalResultName() public finalResultSet constant returns (bytes32) {
        return results[finalResultOrder].name;
    }
}
