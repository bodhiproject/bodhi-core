pragma solidity ^0.4.11;

import './ERC20Basic.sol';

/**
 * @title ERC20 interface
 * @dev Implements ERC20 Token Standard: https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);
    function approve(address _spender, uint256 _value) public returns (bool success);
    function allowance(address _owner, address _spender) public view returns (uint256 remaining);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}
