pragma solidity ^0.4.15;

/// @title Base Oracle contract
contract Oracle {
    address public owner;
    bool public finalResultSet;
    uint public finalResultIndex;

    // Events
    OracleOwnerReplaced(address indexed _newOwner);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier validAddress(address _address) {
        require(_address != 0x0);
        _;
    }

    /// @notice Current owner of Oracle can assign a new Oracle.
    function replaceOwner(address _newOwner) public onlyOwner validAddress(_newOwner) {
        require(!finalResultSet);
        owner = _newOwner;
        OracleOwnerReplaced(_newOwner);
    }

    /// @dev Abstract function that Oracles should implement. Should check if _finalResultIndex is valid.
    function setFinalResult(uint _finalResultIndex) public onlyOwner;

    /// @notice Check to see if the Oracle has set the final result.
    /// @return Boolean if final result is set by Oracle.
    function isFinalResultSet() public constant returns (bool) {
        return finalResultSet;
    }

    /// @notice Gets the final result index set by Oracle.
    /// @return The index of the final result set by Oracle.
    function getFinalResultIndex() public constant returns (uint) {
        return finalResultIndex;
    }
}
