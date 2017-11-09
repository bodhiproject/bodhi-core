#!/bin/bash

echo 'Compiling AddressManager.sol into /compiled'
solc --optimize --bin --abi --hashes --allow-paths contracts/libs/* -o compiled --overwrite contracts/storage/AddressManager.sol

echo 'Compiling EventFactory.sol into /compiled'
solc ..=.. --optimize --bin --abi --hashes --allow-paths contracts/libs/*,contracts/storage/* -o compiled --overwrite contracts/events/EventFactory.sol

echo 'Compiling OracleFactory.sol into /compiled'
solc ..=.. --optimize --bin --abi --hashes --allow-paths contracts/libs,contracts/storage -o compiled --overwrite contracts/oracles/OracleFactory.sol