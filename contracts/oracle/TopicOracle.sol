pragma solidity ^0.4.15;

contract TopicOracle is Oracle {
    bytes32 public name;
    Result[] results;
    uint256 public bettingEndBlock;

    function TopicOracle(
        address _owner, 
        bytes32 _name, 
        bytes32[] _resultNames, 
        uint256 _bettingEndBlock) 
        Oracle(_owner)
        public
    {
        require(_name.length > 0);
        require(_resultNames.length > 1);
        require(_bettingEndBlock > block.number);

        name = _name;

        for (uint i = 0; i < _resultNames.length; i++) {
            results.push(Result({ name: _resultNames[i], balance: 0 }));
        }

        bettingEndBlock = _bettingEndBlock;
    }
}
