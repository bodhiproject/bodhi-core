pragma solidity ^0.4.18;

import '../tokens/StandardToken.sol';

contract StandardTokenMock is StandardToken {
    /*@CTK init_mock_standard_token
      @post __post.balances[_initialAccount] == _initialBalance
      @post __post.totalSupply == _initialBalance
     */
    function StandardTokenMock(address _initialAccount, uint256 _initialBalance) public {
        balances[_initialAccount] = _initialBalance;
        totalSupply = _initialBalance;
    }
}
