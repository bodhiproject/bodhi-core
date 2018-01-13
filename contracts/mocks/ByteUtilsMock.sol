pragma solidity ^0.4.18;

import "../libs/ByteUtils.sol";

contract ByteUtilsMock {
    function isEmpty(bytes32 _source) public pure returns (bool) {
        return ByteUtils.isEmpty(_source);
    }

    function bytesArrayToString(bytes32[10] _data) public pure returns (string) {
        return ByteUtils.bytesArrayToString(_data);
    }
}
