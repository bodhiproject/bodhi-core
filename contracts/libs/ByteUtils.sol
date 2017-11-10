pragma solidity ^0.4.18;

library ByteUtils {
    function isEmpty(bytes32 _source) internal pure returns (bool) {
        return _source == 0x0;
    }

    function toString(bytes32[10] _data) internal pure returns (string) {
        uint8 nonEmptySlots = 0;
        for (uint i = 0; i < _data.length; i++) {
            if (_data[i] != 0x0) {
                nonEmptySlots++;
            } else {
                break;
            }
        }

        bytes memory bytesString = new bytes(nonEmptySlots * 32);
        uint length;
        for (i = 0; i < nonEmptySlots; i++) {
            for (uint j = 0; j < 32; j++) {
                byte char = byte(bytes32(uint(_data[i]) * 2 ** (8 * j)));
                if (char != 0) {
                    bytesString[length] = char;
                    length += 1;
                }
            }
        }

        bytes memory bytesStringTrimmed = new bytes(length);
        for (i = 0; i < length; i++) {
            bytesStringTrimmed[i] = bytesString[i];
        }

        return string(bytesStringTrimmed);
    }
}
