pragma solidity ^0.4.18;

contract BaseContract {
    struct ResultBalance {
        uint256 totalBets;
        uint256 totalVotes;
        mapping(address => uint256) bets;
        mapping(address => uint256) votes;
    }

    uint8 public constant INVALID_RESULT_INDEX = 255;

    uint8 public numOfResults;
    uint8 public resultIndex = INVALID_RESULT_INDEX;
    uint16 public version;
    ResultBalance[11] internal balances;

    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }

    /*
    * @notice Gets the bet balances of the sender for all the results.
    * @return An array of all the bet balances of the sender.
    */
    function getBetBalances() 
        public
        view
        returns (uint256[11]) 
    {
        uint256[11] memory betBalances;
        for (uint8 i = 0; i < numOfResults; i++) {
            betBalances[i] = balances[i].bets[msg.sender];
        }
        return betBalances;
    }

    /*
    * @notice Gets total bets for all the results.
    * @return An array of total bets for all results.
    */
    function getTotalBets() 
        public
        view
        returns (uint256[11])
    {
        uint256[11] memory totalBets;
        for (uint8 i = 0; i < numOfResults; i++) {
            totalBets[i] = balances[i].totalBets;
        }
        return totalBets;
    }

    /*
    * @notice Gets the vote balances of the sender for all the results.
    * @return An array of all the vote balances of the sender.
    */
    function getVoteBalances() 
        public
        view
        returns (uint256[11]) 
    {
        uint256[11] memory voteBalances;
        for (uint8 i = 0; i < numOfResults; i++) {
            voteBalances[i] = balances[i].votes[msg.sender];
        }
        return voteBalances;
    }

    /*
    * @notice Gets total votes for all the results.
    * @return An array of total votes for all results.
    */
    function getTotalVotes() 
        public
        view
        returns (uint256[11])
    {
        uint256[11] memory totalVotes;
        for (uint8 i = 0; i < numOfResults; i++) {
            totalVotes[i] = balances[i].totalVotes;
        }
        return totalVotes;
    }
}
