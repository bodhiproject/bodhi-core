pragma solidity ^0.4.18;

library ByteUtils {
    function isEmpty(bytes32 _source) internal pure returns (bool) {
        return _source == 0x0;
    }

    function bytesArrayToString(bytes32[10] _data) internal pure returns (string) {
        bytes memory allBytes = new bytes(10 * 32);
        uint length;
        for (uint i = 0; i < 10; i++) {
            for (uint j = 0; j < 32; j++) {
                byte char = _data[i][j];
                if (char != 0) {
                    allBytes[length] = char;
                    length++;
                }
            }
        }

        bytes memory trimmedBytes = new bytes(length + 1);
        for (i = 0; i < length; i++) {
            trimmedBytes[i] = allBytes[i];
        }

        return string(trimmedBytes);
    }

    function bytesToString(bytes32 _data) internal pure returns (string) {
        bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(_data) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }

        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }

        return string(bytesStringTrimmed);
    }
}
