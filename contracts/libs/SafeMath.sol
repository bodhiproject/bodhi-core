pragma solidity ^0.4.11;

library SafeMath {
    /*@CTK SafeMath_add
      @tag spec
      @post __reverted == __has_assertion_failure
      @post __has_assertion_failure == __has_overflow
      @post __reverted == false -> __return == x + y
      @post msg == msg__post
    */
    function add(uint256 x, uint256 y) internal pure returns(uint256) {
        uint256 z = x + y;
        assert((z >= x) && (z >= y));
        return z;
    }

    /*@CTK SafeMath_sub
      @tag spec
      @post __reverted == __has_assertion_failure
      @post __has_overflow == true -> __has_assertion_failure == true
      @post __reverted == false -> __return == x - y
      @post msg == msg__post
    */
    function sub(uint256 x, uint256 y) internal pure returns(uint256) {
        assert(x >= y);
        uint256 z = x - y;
        return z;
    }

    /*@CTK SafeMath_mul
      @tag spec
      @post __reverted == __has_assertion_failure
      @post __has_assertion_failure == __has_overflow
      @post __reverted == false -> __return == x * y
      @post msg == msg__post
    */
    function mul(uint256 x, uint256 y) internal pure returns(uint256) {
        uint256 z = x * y;
        assert((x == 0) || (z / x == y));
        return z;
    }

    /*@CTK SafeMath_div
      @tag spec
      @post __reverted == __has_assertion_failure
      @post y == 0 -> __has_assertion_failure == true
      @post __has_overflow == true -> __has_assertion_failure == true
      @post __reverted == false -> __return == x / y
      @post msg == msg__post
    */
    function div(uint256 x, uint256 y) internal pure returns(uint256) {
        assert(y != 0);
        uint256 z = x / y;
        assert(x == y * z + x % y);
        return z;
    }
}
