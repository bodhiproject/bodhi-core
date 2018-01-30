pragma solidity ^0.4.18;

import "./Oracle.sol";

contract DecentralizedOracle is Oracle {
    uint8 public lastResultIndex;
    uint256 public arbitrationEndTime;

    /*
    * @notice Creates new DecentralizedOracle contract.
    * @param _version The contract version.
    * @param _owner The address of the owner.
    * @param _eventAddress The address of the Event.
    * @param _numOfResults The number of result options.
    * @param _lastResultIndex The last result index set by the DecentralizedOracle.
    * @param _arbitrationEndTime The unix time when the voting period ends.
    * @param _consensusThreshold The BOT amount that needs to be reached for this DecentralizedOracle to be valid.
    */
    function DecentralizedOracle(
        uint16 _version,
        address _owner,
        address _eventAddress,
        uint8 _numOfResults,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndTime,
        uint256 _consensusThreshold)
        Ownable(_owner)
        public
        validAddress(_eventAddress)
    {
        require(_numOfResults > 0);
        require(_arbitrationEndTime > block.timestamp);
        require(_consensusThreshold > 0);

        version = _version;
        eventAddress = _eventAddress;
        numOfResults = _numOfResults;
        lastResultIndex = _lastResultIndex;
        arbitrationEndTime = _arbitrationEndTime;
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
        require(block.timestamp < arbitrationEndTime);
        require(_eventResultIndex != lastResultIndex);

        balances[_eventResultIndex].totalVotes = balances[_eventResultIndex].totalVotes.add(_botAmount);
        balances[_eventResultIndex].votes[msg.sender] = balances[_eventResultIndex].votes[msg.sender]
            .add(_botAmount);

        ITopicEvent(eventAddress).voteFromOracle(_eventResultIndex, msg.sender, _botAmount);
        OracleResultVoted(version, address(this), msg.sender, _eventResultIndex, _botAmount);

        if (balances[_eventResultIndex].totalVotes >= consensusThreshold) {
            setResult();
        }
    }

    /*
    * @notice This can be called by anyone if this VotingOracle did not meet the consensus threshold and has reached 
    *   the arbitration end time. This finishes the Event and allows winners to withdraw their winnings from the Event 
    *   contract.
    * @return Flag to indicate success of finalizing the result.
    */
    function finalizeResult() 
        external 
        isNotFinished()
    {
        require(block.timestamp >= arbitrationEndTime);

        finished = true;
        resultIndex = lastResultIndex;

        ITopicEvent(eventAddress).decentralizedOracleFinalizeResult();
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
            uint256 totalVoteBalance = balances[i].totalVotes;
            if (totalVoteBalance > winningVoteBalance) {
                winningVoteBalance = totalVoteBalance;
                resultIndex = i;
            }
        }

        ITopicEvent(eventAddress).decentralizedOracleSetResult(resultIndex, winningVoteBalance);
        OracleResultSet(version, address(this), resultIndex);
    }
}
