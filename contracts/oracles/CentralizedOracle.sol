pragma solidity ^0.4.18;

import "./Oracle.sol";

contract CentralizedOracle is Oracle {
    address public oracle;
    uint256 public bettingEndBlock;
    uint256 public resultSettingEndBlock;

    /*
    * @notice Creates new CentralizedOracle contract.
    * @param _owner The address of the owner.
    * @param _oracle The address of the CentralizedOracle that will ultimately decide the result.
    * @param _eventAddress The address of the Event.
    * @param _eventName The name of the Event.
    * @param _eventResultNames The result options of the Event.
    * @param _numOfResults The number of result options.
    * @param _bettingEndBlock The block when betting will end.
    * @param _resultSettingEndBlock The last block the Centralized Oracle can set the result.
    * @param _consensusThreshold The BOT amount that needs to be paid by the Oracle for their result to be valid.
    */
    function CentralizedOracle(
        address _owner,
        address _oracle,
        address _eventAddress,
        bytes32[10] _eventName,
        bytes32[10] _eventResultNames,
        uint8 _numOfResults,
        uint256 _bettingEndBlock,
        uint256 _resultSettingEndBlock,
        uint256 _consensusThreshold)
        Ownable(_owner)
        public
        validAddress(_oracle)
        validAddress(_eventAddress)
    {
        require(!_eventName[0].isEmpty());
        require(!_eventResultNames[0].isEmpty());
        require(!_eventResultNames[1].isEmpty());
        require(_numOfResults > 0);
        require(_bettingEndBlock > block.number);
        require(_resultSettingEndBlock > _bettingEndBlock);
        require(_consensusThreshold > 0);

        oracle = _oracle;
        eventAddress = _eventAddress;
        eventName = _eventName;
        eventResultNames = _eventResultNames;
        numOfResults = _numOfResults;
        bettingEndBlock = _bettingEndBlock;
        resultSettingEndBlock = _resultSettingEndBlock;
        consensusThreshold = _consensusThreshold;
    }
}
