pragma solidity ^0.4.4;

import "./SafeMath.sol";

contract Topic is SafeMath {
    struct Result {
        bytes32 name;
        uint256 balance;
        mapping (address => uint256) betBalances;
    }

    address owner;
    string public name;
    Result[] public results;
    uint256 public bettingEndBlock;
    uint finalResultIndex;
    bool finalResultSet;

    event FinalResultSet(uint _finalResultIndex);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier validResultIndex(uint resultIndex) {
        require(resultIndex >= 0);
        require(resultIndex <= results.length - 1);
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
        require(!finalResultSet);
        _;
    }

    modifier finalResultIsSet() {
        require(finalResultSet);
        _;
    }

    function Topic(address _owner, string _name, bytes32[] _resultNames, uint256 _bettingEndBlock) {
        owner = _owner;
        name = _name;

        // Cannot have a prediction topic with only 1 result
//        require(_resultNames.length > 1);

        for (uint i = 0; i < _resultNames.length; i++) {
            results.push(Result({
            name: _resultNames[i],
            balance: 0
            }));
        }

        bettingEndBlock = _bettingEndBlock;
    }

    function getResultName(uint resultIndex) public validResultIndex(resultIndex) constant returns (bytes32) {
        return results[resultIndex].name;
    }

    function bet(uint resultIndex) public hasNotEnded payable {
        Result storage result = results[resultIndex];
        result.balance = safeAdd(result.balance, msg.value);
        result.betBalances[msg.sender] = safeAdd(result.betBalances[msg.sender], msg.value);
    }

    function withdrawBet() public finalResultIsSet {
        uint256 totalEventBalance = 0;
        for (uint i = 0; i < results.length; i++) {
            totalEventBalance = safeAdd(results[i].balance, totalEventBalance);
        }
        require(totalEventBalance > 0);

        Result storage finalResult = results[finalResultIndex];
        uint256 betBalance = finalResult.betBalances[msg.sender];
        require(betBalance > 0);

        // Clear out balance in case withdrawBet() is called again before the prior transfer is complete
        finalResult.betBalances[msg.sender] = 0;

        uint256 withdrawAmount = safeDivide(safeMultiply(totalEventBalance, betBalance), finalResult.balance);
        require(withdrawAmount > 0);

        msg.sender.transfer(withdrawAmount);
    }

    function revealResult(uint resultIndex)
        public
        onlyOwner
        hasEnded
        validResultIndex(resultIndex)
        finalResultNotSet
    {
        finalResultIndex = resultIndex;
        finalResultSet = true;
        FinalResultSet(finalResultIndex);
    }

    function getFinalResultIndex() public finalResultIsSet constant returns (uint) {
        return finalResultIndex;
    }

    function getFinalResultName() public finalResultIsSet constant returns (bytes32) {
        return results[finalResultIndex].name;
    }
}
