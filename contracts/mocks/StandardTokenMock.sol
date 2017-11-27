pragma solidity ^0.4.18;

import '../../contracts/tokens/StandardToken.sol';

contract StandardTokenMock is StandardToken {
    function StandardTokenMock(address _initialAccount, uint256 _initialBalance) public {
        balances[_initialAccount] = _initialBalance;
        totalSupply = _initialBalance;
    }
}
