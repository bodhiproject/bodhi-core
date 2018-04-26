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

    // Modifiers
    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }

    /*
    * @notice Gets the bet balances of the sender for all the results.
    * @return An array of all the bet balances of the sender.
    */
    /*@CTK get_bet_balances
      @tag spec
      @post forall j: uint. (j >= 0 /\ j < numOfResults) -> __return[j] == balances[j].bets[msg.sender]
      */
    function getBetBalances()
        public
        view
        returns (uint256[11])
    {
        uint256[11] memory betBalances;
        /*@CTK set_bet_balances
          @var uint8 i
          @var BaseContract this
          @var uint256[11] betBalances
          @inv forall j: uint. (j >= 0 /\ j < i) -> betBalances[j] == this.balances[j].bets[msg.sender]
          @inv i <= this.numOfResults
          @inv this == this__pre
          @post i >= numOfResults
         */
        for (uint8 i = 0; i < numOfResults; i++) {
            betBalances[i] = balances[i].bets[msg.sender];
        }
        return betBalances;
    }

    /*
    * @notice Gets total bets for all the results.
    * @return An array of total bets for all results.
    */
    /*@CTK get_total_bets
      @tag spec
      @post forall j: uint. (j >= 0 /\ j < numOfResults) -> __return[j] == balances[j].totalBets
      */
    function getTotalBets()
        public
        view
        returns (uint256[11])
    {
        uint256[11] memory totalBets;
        /*@CTK set_total_bets
          @var uint8 i
          @var BaseContract this
          @var uint256[11] totalBets
          @inv forall j: uint. (j >= 0 /\ j < i) -> totalBets[j] == this.balances[j].totalBets
          @inv i <= this.numOfResults
          @inv this == this__pre
          @post i >= numOfResults
         */
        for (uint8 i = 0; i < numOfResults; i++) {
            totalBets[i] = balances[i].totalBets;
        }
        return totalBets;
    }

    /*
    * @notice Gets the vote balances of the sender for all the results.
    * @return An array of all the vote balances of the sender.
    */
    /*@CTK get_vote_balances
      @tag spec
      @post forall j: uint. (j >= 0 /\ j < numOfResults) -> __return[j] == balances[j].votes[msg.sender]
      */
    function getVoteBalances()
        public
        view
        returns (uint256[11])
    {
        uint256[11] memory voteBalances;
        /*@CTK set_vote_balances
          @var uint8 i
          @var BaseContract this
          @var uint256[11] voteBalances
          @inv forall j: uint. (j >= 0 /\ j < i) -> voteBalances[j] == this.balances[j].votes[msg.sender]
          @inv i <= this.numOfResults
          @inv this == this__pre
          @post i >= numOfResults
         */
        for (uint8 i = 0; i < numOfResults; i++) {
            voteBalances[i] = balances[i].votes[msg.sender];
        }
        return voteBalances;
    }

    /*
    * @notice Gets total votes for all the results.
    * @return An array of total votes for all results.
    */
    /*@CTK get_total_votes
      @tag spec
      @post forall j: uint. (j >= 0 /\ j < numOfResults) -> __return[j] == balances[j].totalVotes
      */
    function getTotalVotes()
        public
        view
        returns (uint256[11])
    {
        uint256[11] memory totalVotes;
        /*@CTK set_total_votes
          @var uint8 i
          @var BaseContract this
          @var uint256[11] totalVotes
          @inv forall j: uint. (j >= 0 /\ j < i) -> totalVotes[j] == this.balances[j].totalVotes
          @inv i <= this.numOfResults
          @inv this == this__pre
          @post i >= numOfResults
         */
        for (uint8 i = 0; i < numOfResults; i++) {
            totalVotes[i] = balances[i].totalVotes;
        }
        return totalVotes;
    }
}
