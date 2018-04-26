pragma solidity ^0.4.18;

import "../libs/ByteUtils.sol";

contract ByteUtilsMock {
    /*@CTK isEmptyMock
      @post __return == true -> _source == 0
      @post __return == false -> _source != 0
    */
    function isEmpty(bytes32 _source) public pure returns (bool) {
        return ByteUtils.isEmpty(_source);
    }

    function bytesArrayToString(bytes32[10] _data) public pure returns (string) {
        return ByteUtils.bytesArrayToString(_data);
    }
}
