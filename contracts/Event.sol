pragma solidity ^0.4.4;

import "./SafeMath.sol";

contract Event is SafeMath{
    struct Result {
        bytes32 name;
    }

    address owner;

    uint256 public bettingEndBlock;

    bytes32 name;
    Result[] public results;
    bytes32 firstResultName;
    bytes32 secondResultName;

    uint256 firstResultBalance;
    uint256 secondResultBalance;
    mapping (address => uint256) firstBetBalances;
    mapping (address => uint256) secondBetBalances;

    uint256 finalResultOrder = uint256(-1);

    function Event(bytes32 _name, bytes32[] resultNames, uint256 _bettingEndBlock) {
        owner = msg.sender;
        name = _name;

        for (uint i = 0; i < resultNames.length; i++) {
            results.push(Result({
                name: resultNames[i]
            }));
        }

        bettingEndBlock = _bettingEndBlock;
    }

    function getResultName(uint resultOrder) constant public returns (bytes32) {
    	if (resultOrder != 0 && resultOrder != 1) throw;
    	if (resultOrder == 0) {
    		return firstResultName;
    	} else if (resultOrder == 1) {
    		return secondResultName;
    	} else {
            throw;
        }
    }

    function bet(uint resultOrder) public payable {
    	if (resultOrder != 0 && resultOrder != 1) throw;
    	if (block.number > bettingEndBlock) throw;

    	if (resultOrder == 0) {
    		firstResultBalance = safeAdd(firstResultBalance, msg.value);
    		firstBetBalances[msg.sender] = safeAdd(firstBetBalances[msg.sender], msg.value);
    	} else if (resultOrder == 1) {
    		secondResultBalance = safeAdd(secondResultBalance, msg.value);
    		secondBetBalances[msg.sender] = safeAdd(secondBetBalances[msg.sender], msg.value);
    	} else {
            throw;
        }
    }

    function revealResult(uint resultOrder) public {
        if (resultOrder != 0 && resultOrder != 1) throw;
        if (block.number <= bettingEndBlock) throw;
        if (owner != msg.sender) throw;

        finalResultOrder = resultOrder;
    }

    function withdrawBet() public {
        if (finalResultOrder != 0 && finalResultOrder != 1) throw;

        uint256 totalEventBalance = safeAdd(firstResultBalance, secondResultBalance);

        uint256 balance;
        uint256 withdrawBalance;
        if (finalResultOrder == 0) {
            balance = firstBetBalances[msg.sender];
            if (balance == 0) throw;

            withdrawBalance = totalEventBalance * balance / firstResultBalance;
            if (!msg.sender.send(withdrawBalance)) throw;
        } else if (finalResultOrder == 1) {
            balance = secondBetBalances[msg.sender];
            if (balance == 0) throw;

            withdrawBalance = totalEventBalance * balance / secondResultBalance;
            if (!msg.sender.send(withdrawBalance)) throw;
        } else {
            throw;
        }
    }

    function getFinalResultOrder() constant public returns (uint) {
        if (finalResultOrder != 0 && finalResultOrder != 1) throw;

        return finalResultOrder;
    }

    function getFinalResultName() constant public returns (bytes32) {
        if (finalResultOrder != 0 && finalResultOrder != 1) throw;

        if (finalResultOrder == 0) {
            return firstResultName;
        } else if (finalResultOrder == 1) {
            return secondResultName;
        } else {
            throw;
        }
    }
}
