pragma solidity ^0.4.18;

import '../tokens/BasicToken.sol';

contract BasicTokenMock is BasicToken {
    /*@CTK init_mock_basic_token
      @post __post.balances[_initialAccount] == _initialBalance
      @post __post.totalSupply == _initialBalance
    */
    function BasicTokenMock(address _initialAccount, uint256 _initialBalance) public {
        balances[_initialAccount] = _initialBalance;
        totalSupply = _initialBalance;
    }
}
