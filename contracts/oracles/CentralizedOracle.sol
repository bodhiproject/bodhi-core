pragma solidity ^0.4.18;

import "./Oracle.sol";

contract CentralizedOracle is Oracle {
    address public oracle;
    uint256 public bettingStartBlock;
    uint256 public bettingEndBlock;
    uint256 public resultSettingStartBlock;
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
        uint256 _bettingStartBlock,
        uint256 _bettingEndBlock,
        uint256 _resultSettingStartBlock,
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
        require(_bettingStartBlock > block.number);
        require(_bettingEndBlock > _bettingStartBlock);
        require(_resultSettingStartBlock >= _bettingEndBlock);
        require(_resultSettingEndBlock > _resultSettingStartBlock);
        require(_consensusThreshold > 0);

        oracle = _oracle;
        eventAddress = _eventAddress;
        eventName = _eventName;
        eventResultNames = _eventResultNames;
        numOfResults = _numOfResults;
        bettingStartBlock = _bettingStartBlock;
        bettingEndBlock = _bettingEndBlock;
        resultSettingStartBlock = _resultSettingStartBlock;
        resultSettingEndBlock = _resultSettingEndBlock;
        consensusThreshold = _consensusThreshold;
    }

    /// @notice Fallback function that rejects any amount sent to the contract.
    function() external payable {
        revert();
    }

    /*
    * @notice Allows betting on a result using the blockchain token.
    * @param _resultIndex The index of result to bet on.
    */
    function bet(uint8 _resultIndex) 
        external 
        payable
        validResultIndex(_resultIndex)
        isNotFinished()
    {
        require(block.number >= bettingStartBlock);
        require(block.number < bettingEndBlock);
        require(msg.value > 0);

        resultBalances[_resultIndex].totalBets = resultBalances[_resultIndex].totalBets.add(msg.value);
        resultBalances[_resultIndex].bets[msg.sender] = resultBalances[_resultIndex].bets[msg.sender].add(msg.value);

        ITopicEvent(eventAddress).betFromOracle.value(msg.value)(msg.sender, _resultIndex);
        OracleResultVoted(address(this), msg.sender, _resultIndex, msg.value);
    }

    /* 
    * @notice CentralizedOracle should call this to set the result. Requires the Oracle to approve() BOT in the amount 
    *   of the consensus threshold.
    * @param _resultIndex The index of the result to set.
    */
    function setResult(uint8 _resultIndex)
        external 
        validResultIndex(_resultIndex)
        isNotFinished()
    {
        require(block.number >= resultSettingStartBlock);
        if (block.number < resultSettingEndBlock) {
            require(msg.sender == oracle);
        }

        finished = true;
        resultIndex = _resultIndex;

        resultBalances[_resultIndex].totalVotes = resultBalances[_resultIndex].totalVotes.add(consensusThreshold);
        resultBalances[_resultIndex].votes[msg.sender] = resultBalances[_resultIndex].votes[msg.sender]
            .add(consensusThreshold);

        ITopicEvent(eventAddress).centralizedOracleSetResult(msg.sender, _resultIndex, consensusThreshold);
        OracleResultSet(address(this), _resultIndex);
    }
}
