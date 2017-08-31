pragma solidity ^0.4.4;

import "./SafeMath.sol";

contract Topic is SafeMath {
    struct Result {
        bytes32 name;
        uint256 balance;
        mapping (address => uint256) betBalances;
    }

    address public owner;
    bytes32 public name;
    Result[] results;
    uint256 public bettingEndBlock;
    uint finalResultIndex;
    bool public finalResultSet;

    event TopicCreated(bytes32 _name);
    event BetAccepted(address _better, uint _resultIndex, uint256 _betAmount, uint256 _betBalance);
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

    function Topic(address _owner, bytes32 _name, bytes32[] _resultNames, uint256 _bettingEndBlock) {
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

        TopicCreated(name);
    }

    function getOwner() public constant returns (address) {
        return owner;
    }

    function getResultName(uint resultIndex) 
        public 
        validResultIndex(resultIndex) 
        constant 
        returns (bytes32) 
    {
        return results[resultIndex].name;
    }

    function getResultBalance(uint resultIndex) 
        public 
        validResultIndex(resultIndex) 
        constant 
        returns (uint256) 
    {
        return results[resultIndex].balance;
    }

    function getBetBalance(uint resultIndex) 
        public 
        validResultIndex(resultIndex) 
        constant 
        returns (uint256) 
    {
        return results[resultIndex].betBalances[msg.sender];
    }

    function bet(uint resultIndex) public hasNotEnded payable {
        Result storage updatedResult = results[resultIndex];
        updatedResult.balance = safeAdd(updatedResult.balance, msg.value);
        updatedResult.betBalances[msg.sender] = safeAdd(updatedResult.betBalances[msg.sender], msg.value);
        results[resultIndex] = updatedResult;

        BetAccepted(msg.sender, resultIndex, msg.value, results[resultIndex].betBalances[msg.sender]);
    }

    function withdrawWinnings() public hasEnded finalResultIsSet {
        uint256 totalTopicBalance = 0;
        for (uint i = 0; i < results.length; i++) {
            totalTopicBalance = safeAdd(results[i].balance, totalTopicBalance);
        }
        require(totalTopicBalance > 0);

        Result storage finalResult = results[finalResultIndex];
        uint256 betBalance = finalResult.betBalances[msg.sender];
        require(betBalance > 0);

        // Clear out balance in case withdrawBet() is called again before the prior transfer is complete
        finalResult.betBalances[msg.sender] = 0;

        uint256 withdrawAmount = safeDivide(safeMultiply(totalTopicBalance, betBalance), finalResult.balance);
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

    function destroy() onlyOwner {
        suicide(owner);
    }
}
