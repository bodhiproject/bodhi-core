pragma solidity ^0.4.18;

library ByteUtils {
    function isEmpty(bytes32 _source) internal pure returns (bool) {
        return _source == 0x0;
    }
}
