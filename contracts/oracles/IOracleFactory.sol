pragma solidity ^0.4.18;

contract IOracleFactory {
    function createOracle(bytes32[10] _eventName, bytes32[10] _eventResultNames, uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock, uint256 _arbitrationOptionEndBlock) public payable returns (Oracle oracleAddress);
}
