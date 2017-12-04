pragma solidity ^0.4.18;

import "./Oracle.sol";

contract DecentralizedOracle is Oracle {
    uint8 public constant oracleType = 1;

    uint8 public lastResultIndex;
    uint256 public arbitrationEndBlock;

    /*
    * @notice Creates new DecentralizedOracle contract.
    * @param _owner The address of the owner.
    * @param _eventAddress The address of the Event.
    * @param _eventName The name of the Event.
    * @param _eventResultNames The result options of the Event.
    * @param _numOfResults The number of result options.
    * @param _lastResultIndex The last result index set by the DecentralizedOracle.
    * @param _arbitrationEndBlock The max block of this arbitration that voting will be allowed.
    * @param _consensusThreshold The BOT amount that needs to be reached for this DecentralizedOracle to be valid.
    */
    function DecentralizedOracle(
        address _owner,
        address _eventAddress,
        bytes32[10] _eventName,
        bytes32[10] _eventResultNames,
        uint8 _numOfResults,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold)
        Ownable(_owner)
        public
        validAddress(_eventAddress)
    {
        require(!_eventName[0].isEmpty());
        require(!_eventResultNames[0].isEmpty());
        require(!_eventResultNames[1].isEmpty());
        require(_numOfResults > 0);
        require(_arbitrationEndBlock > block.number);
        require(_consensusThreshold > 0);

        eventAddress = _eventAddress;
        eventName = _eventName;
        eventResultNames = _eventResultNames;
        numOfResults = _numOfResults;
        lastResultIndex = _lastResultIndex;
        arbitrationEndBlock = _arbitrationEndBlock;
        consensusThreshold = _consensusThreshold;
    }

    /*
    * @notice Vote on an Event result which requires BOT payment.
    * @param _eventResultIndex The Event result which is being voted on.
    * @param _botAmount The amount of BOT used to vote.
    */
    function voteResult(uint8 _eventResultIndex, uint256 _botAmount) 
        external 
        validResultIndex(_eventResultIndex) 
        isNotFinished()
    {
        require(_botAmount > 0);
        require(block.number < arbitrationEndBlock);
        require(_eventResultIndex != lastResultIndex);

        ResultBalance storage resultBalance = resultBalances[_eventResultIndex];
        resultBalance.total = resultBalance.total.add(_botAmount);
        resultBalance.balances[msg.sender] = resultBalance.balances[msg.sender].add(_botAmount);

        currentBalance = currentBalance.add(_botAmount);

        ITopicEvent(eventAddress).voteFromOracle(_eventResultIndex, msg.sender, _botAmount);
        OracleResultVoted(oracleType, msg.sender, _eventResultIndex, _botAmount);

        if (resultBalance.total >= consensusThreshold) {
            setResult();
        }
    }

    function invalidateOracle() 
        external
        isNotFinished() 
    {
        require(lastResultIndex == invalidResultIndex);
        require(block.number >= arbitrationEndBlock);

        finished = true;

        // TODO: call TopicEvent.invalidate()
        OracleInvalidated(oracleType);
    }

    /*
    * @notice This can be called by anyone if this VotingOracle did not meet the consensus threshold and has reached 
    *   the arbitration end block. This finishes the Event and allows winners to withdraw their winnings from the Event 
    *   contract.
    * @return Flag to indicate success of finalizing the result.
    */
    function finalizeResult() 
        external 
        isNotFinished()
        validResultIndex(lastResultIndex)
    {
        require(block.number >= arbitrationEndBlock);

        finished = true;

        ITopicEvent(eventAddress).finalizeResult();
    }

    /*
    * @dev DecentralizedOracle is validated and set the result of the Event.
    */
    function setResult() 
        private 
    {
        finished = true;

        uint256 winningVoteBalance = 0;
        for (uint8 i = 0; i < numOfResults; i++) {
            uint256 totalVoteBalance = resultBalances[i].total;
            if (totalVoteBalance > winningVoteBalance) {
                winningVoteBalance = totalVoteBalance;
                resultIndex = i;
            }
        }

        ITopicEvent(eventAddress).votingOracleSetResult(resultIndex, currentBalance);
        OracleResultSet(oracleType, resultIndex);
    }
}
