pragma solidity ^0.4.15;

library IdUtils {
    function getOracleHash(
        bytes _eventName, 
        bytes32[] _eventResultNames,
        uint256 _eventBettingEndBlock,
        uint256 _decisionEndBlock,
        uint256 _arbitrationOptionEndBlock) 
        internal
        pure
        returns (bytes32)
    {
        return keccak256(_eventName, _eventResultNames, _eventBettingEndBlock, _decisionEndBlock, 
            _arbitrationOptionEndBlock);
    }
}
