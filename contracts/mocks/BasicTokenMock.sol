pragma solidity ^0.4.18;

import '../../contracts/tokens/BasicToken.sol';

contract BasicTokenMock is BasicToken {
    function BasicTokenMock(address _initialAccount, uint256 _initialBalance) public {
        balances[_initialAccount] = _initialBalance;
        totalSupply = _initialBalance;
    }
}
