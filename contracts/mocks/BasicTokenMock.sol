pragma solidity ^0.4.18;

import '../tokens/BasicToken.sol';

contract BasicTokenMock is BasicToken {
    constructor(address _initialAccount, uint256 _initialBalance) public {
        balances[_initialAccount] = _initialBalance;
        totalSupply = _initialBalance;
    }
}
