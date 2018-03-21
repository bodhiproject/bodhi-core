#!/bin/bash

echo 'Compiling AddressManager.sol into /compiled'
solc ..=.. --optimize --bin --abi --hashes --allow-paths contracts/libs,contracts/tokens -o build --overwrite contracts/storage/AddressManager.sol

echo 'Compiling EventFactory.sol into /compiled'
solc ..=.. --optimize --bin --abi --hashes --allow-paths contracts/libs,contracts/storage -o build --overwrite contracts/events/EventFactory.sol

echo 'Compiling OracleFactory.sol into /compiled'
solc ..=.. --optimize --bin --abi --hashes --allow-paths contracts/libs,contracts/storage -o build --overwrite contracts/oracles/OracleFactory.sol
