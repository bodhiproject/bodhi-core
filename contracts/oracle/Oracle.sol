pragma solidity ^0.4.15;

/// @title Base Oracle contract
contract Oracle {
    address public owner;
    bool public finalResultSet;
    uint public finalResultIndex;

    /// @notice Check to see if the Oracle has set the final result
    /// @return Boolean if final result is set by Oracle
    function isFinalResultSet() public constant returns (bool) {
        return finalResultSet;
    }

    /// @notice Gets the final result index set by Oracle
    /// @return The index of the final result set by Oracle
    function getFinalResultIndex() public constant returns (uint) {
        return finalResultIndex;
    }
}
