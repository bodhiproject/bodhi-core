pragma solidity ^0.4.15;

/// @title BodhiToken interface contract
/// @dev This contract defines the allowed methods to be called externally.
contract IBodhiToken {
    function transferFrom(address _from, address _to, uint256 _value) returns (bool);
}
