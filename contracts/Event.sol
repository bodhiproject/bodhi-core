pragma solidity ^0.4.4;

import "./SafeMath.sol";

contract Event is SafeMath{
    struct Result {
        bytes32 name;
        uint256 balance;
        mapping (address => uint256) betBalances;
    }

    address owner;
    bytes32 name;
    Result[] public results;
    uint256 public bettingEndBlock;
    uint256 finalResultOrder = uint256(-1);

    function Event(bytes32 _name, bytes32[] resultNames, uint256 _bettingEndBlock) {
        owner = msg.sender;
        name = _name;

        for (uint i = 0; i < resultNames.length; i++) {
            results.push(Result({
                name: resultNames[i],
                balance: 0
            }));
        }

        bettingEndBlock = _bettingEndBlock;
    }

    function getResultName(uint resultOrder) constant public returns (bytes32) {
        return results[resultOrder].name;
    }

    function bet(uint resultOrder) public payable {
    	if (resultOrder != 0 && resultOrder != 1) throw;
    	if (block.number > bettingEndBlock) throw;

        Result storage result = results[resultOrder];
        result.balance = safeAdd(result.balance, msg.value);
        result.betBalances[msg.sender] = safeAdd(result.betBalances[msg.sender], msg.value);
    }

    function withdrawBet() public {
        if (finalResultOrder != 0 && finalResultOrder != 1) throw;

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

    function revealResult(uint resultOrder) public {
        if (resultOrder != 0 && resultOrder != 1) throw;
        if (block.number <= bettingEndBlock) throw;
        if (owner != msg.sender) throw;

        finalResultOrder = resultOrder;
    }

    function getFinalResultOrder() constant public returns (uint) {
        if (finalResultOrder != 0 && finalResultOrder != 1) throw;

        return finalResultOrder;
    }

    function getFinalResultName() constant public returns (bytes32) {
        return results[finalResultOrder].name;
    }
}
