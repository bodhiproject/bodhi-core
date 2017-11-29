pragma solidity ^0.4.18;

import "../libs/Ownable.sol";
import "../libs/SafeMath.sol";
import "../libs/ByteUtils.sol";
import "../ReentrancyGuard.sol";
import "../storage/IAddressManager.sol";
import "../tokens/ERC20.sol";

/// @title Base Oracle contract
contract Oracle is Ownable, ReentrancyGuard {
    using ByteUtils for bytes32;
    using SafeMath for uint256;

    struct Participant {
        bool didSetResult;
        bool didWithdrawEarnings;
        uint8 resultIndex;
        uint256 stakeContributed;
    }

    struct Result {
        bytes32 name;
        uint256 votedBalance;
    }

    uint256 public constant nativeDecimals = 18; // Number of decimals of token used to create Oracle
    uint256 public constant botDecimals = 8; // Number of decimals for BOT
    uint256 public constant minBaseReward = 1 * (10**nativeDecimals); // Minimum amount needed to create Oracle
    uint256 public constant maxStakeContribution = 101 * (10**botDecimals); // Maximum amount of BOT staking contributions allowed

    uint8 public numOfResults;
    bytes32[10] private eventName;
    uint256 public eventBettingEndBlock;
    uint256 public decisionEndBlock; // Block number when Oracle participants can no longer set a result
    uint256 public arbitrationOptionEndBlock; // Block number when Oracle participants can no longer start arbitration
    uint256 public totalStakeContributed;
    Result[10] private eventResults;
    IAddressManager private addressManager;
    mapping(address => Participant) private participants;

    // Modifiers
    modifier validResultIndex(uint8 _resultIndex) {
        require (_resultIndex <= numOfResults - 1);
        _;
    }

    // Events
    event OracleFunded(uint256 _baseRewardAmount);
    event ParticipantVoted(address _participant, uint256 _stakeContributed, uint8 _resultIndex);
    event EarningsWithdrawn(uint256 _amountWithdrawn);

    /// @notice Creates new Oracle contract.
    /// @param _owner The address of the owner.
    /// @param _eventAddress The address of the Event this Oracle will arbitrate.
    /// @param _eventName The name of the Event this Oracle will arbitrate.
    /// @param _eventResultNames The result options of the Event.
    /// @param _lastResultIndex The last result index set by the Oracle.
    /// @param _arbitrationEndBlock The max block of this arbitration that voting will be allowed.
    /// @param _consensusThreshold The amount of BOT that needs to be reached in order for this Oracle to be valid.
    /// @param _addressManager The address of the AddressManager contract.
    function Oracle(
        address _owner,
        address _eventAddress,
        bytes32[10] _eventName,
        bytes32[10] _eventResultNames,
        uint8 _lastResultIndex,
        uint256 _arbitrationEndBlock,
        uint256 _consensusThreshold,
        address _addressManager)
        Ownable(_owner)
        public
        validAddress(_addressManager)
    {
        require(!_eventName[0].isEmpty());
        require(!_eventResultNames[0].isEmpty());
        require(!_eventResultNames[1].isEmpty());
        require(_decisionEndBlock > _eventBettingEndBlock);
        require(_arbitrationOptionEndBlock > _decisionEndBlock);

        eventName = _eventName;

        for (uint i = 0; i < _eventResultNames.length; i++) {
            if (!_eventResultNames[i].isEmpty()) {
                eventResults[i] = Result({
                    name: _eventResultNames[i],
                    votedBalance: 0
                });
                numOfResults++;
            } else {
                break;
            }
        }

        eventBettingEndBlock = _eventBettingEndBlock;
        decisionEndBlock = _decisionEndBlock;
        arbitrationOptionEndBlock = _arbitrationOptionEndBlock;

        addressManager = IAddressManager(_addressManager);
    }

    /// @notice Fallback function that rejects any amount sent to the contract.
    function() external payable {
        revert();
    }

    /// @notice Deposit the base reward for the Oracle.
    function addBaseReward()
        external
        payable
        nonReentrant()
    {
        require(msg.value >= minBaseReward);
        OracleFunded(msg.value);
    }

    /// @notice Vote an Event result which requires BOT payment.
    /// @param _eventResultIndex The Event result which is being voted on.
    /// @param _botAmount The amount of BOT to use for voting.
    function voteResult(uint8 _eventResultIndex, uint256 _botAmount) 
        public 
        validResultIndex(_eventResultIndex) 
    {
        require(_botAmount > 0);
        require(totalStakeContributed.add(_botAmount) <= maxStakeContribution);
        require(block.number >= eventBettingEndBlock);
        require(block.number < decisionEndBlock);
        require(!participants[msg.sender].didSetResult);
        ERC20 token = ERC20(addressManager.bodhiTokenAddress());
        require(token.allowance(msg.sender, address(this)) >= _botAmount);

        Participant storage participant = participants[msg.sender];
        participant.didSetResult = true;
        participant.resultIndex = _eventResultIndex;
        participant.stakeContributed = _botAmount;

        eventResults[_eventResultIndex].votedBalance = eventResults[_eventResultIndex].votedBalance.add(_botAmount);
        totalStakeContributed = totalStakeContributed.add(_botAmount);

        token.transferFrom(msg.sender, address(this), _botAmount);

        ParticipantVoted(msg.sender, _botAmount, _eventResultIndex);
    }

    /// @notice Withdraw earnings if you picked the correct result.
    function withdrawEarnings() 
        public 
    {
        require(block.number >= arbitrationOptionEndBlock);
        require(participants[msg.sender].stakeContributed > 0);
        require(totalStakeContributed > 0);
        require(!participants[msg.sender].didWithdrawEarnings);

        uint256 withdrawAmount = getEarningsAmount();
        participants[msg.sender].didWithdrawEarnings = true;

        require(withdrawAmount > 0);
        msg.sender.transfer(withdrawAmount);

        EarningsWithdrawn(withdrawAmount);
    }

    /// @notice Gets the Event name as a string.
    /// @return The name of the Event.
    function getEventName() 
        public 
        view 
        returns (string) 
    {
        return ByteUtils.toString(eventName);
    }

    /// @notice Gets the Event result name given a valid index.
    /// @param _eventResultIndex The index of the wanted result name.
    /// @return The name of the Event result.
    function getEventResultName(uint8 _eventResultIndex) 
        public 
        validResultIndex(_eventResultIndex) 
        view 
        returns (bytes32) 
    {
        return eventResults[_eventResultIndex].name;
    }

    /// @notice Gets the stake contributed by the Oracle participant.
    /// @return The amount of stake contributed by the Oracle participant.
    function getStakeContributed() 
        public 
        view 
        returns(uint256) 
    {
        return participants[msg.sender].stakeContributed;
    }

    /// @notice Shows if the Oracle participant has voted yet.
    /// @return Flag that shows if the Oracle participant has voted yet.
    function didSetResult() 
        public 
        view 
        returns(bool) 
    {
        return participants[msg.sender].didSetResult;
    }

    /// @notice Gets the result index the Oracle participant previously voted on.
    /// @return The voted result index.
    function getVotedResultIndex() 
        public 
        view 
        returns(uint8) 
    {
        require(participants[msg.sender].didSetResult);
        return participants[msg.sender].resultIndex;
    }

    /// @notice Gets the final result index set by the Oracle participants.
    /// @return The index of the final result set by Oracle participants.
    function getFinalResultIndex() 
        public 
        view 
        returns (uint8) 
    {
        require(block.number >= decisionEndBlock);

        uint8 finalResultIndex = 0;
        uint256 winningIndexAmount = 0;
        for (uint8 i = 0; i < eventResults.length; i++) {
            uint256 votedBalance = eventResults[i].votedBalance;
            if (votedBalance > winningIndexAmount) {
                winningIndexAmount = votedBalance;
                finalResultIndex = i;
            }
        }

        return finalResultIndex;
    }

    /// @notice Gets the amount of earnings you can withdraw.
    /// @return The amount of earnings you can withdraw.
    function getEarningsAmount() 
        public 
        view 
        returns(uint256) 
    {
        uint256 stakeContributed = participants[msg.sender].stakeContributed;
        if (stakeContributed == 0) {
            return 0;
        }

        if (!participants[msg.sender].didSetResult) {
            return 0;
        }

        if (participants[msg.sender].didWithdrawEarnings) {
            return 0;
        }

        uint8 finalResultIndex = getFinalResultIndex();
        if (participants[msg.sender].resultIndex != finalResultIndex) {
            return 0;
        }

        uint256 winningResultContributions = eventResults[finalResultIndex].votedBalance;
        uint256 losingResultContributions = totalStakeContributed.sub(winningResultContributions);
        return stakeContributed.mul(losingResultContributions).div(winningResultContributions).add(stakeContributed);
    }
}
