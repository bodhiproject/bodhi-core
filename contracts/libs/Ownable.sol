pragma solidity ^0.4.15;

/**
 * @title Ownable contract
 * @dev The Ownable contract has an owner address, and provides basic authorization control functions.
 */
contract Ownable {
    address public owner;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier validAddress(address _address) {
        require(_address != address(0));
        _;
    }

    // Events
    event OwnershipTransferred(address indexed _previousOwner, address indexed _newOwner);

    /// @dev The Ownable constructor sets the original `owner` of the contract to the sender account.
    /*@CTK throw_on_invalid_address
      @post _owner == address(0) -> __reverted == true
    */
    /*@CTK owner_set_on_success
      @pre __reverted == false -> __post.owner == _owner
     */
    function Ownable(address _owner) public validAddress(_owner) {
        owner = _owner;
    }

    /// @dev Allows the current owner to transfer control of the contract to a newOwner.
    /// @param _newOwner The address to transfer ownership to.
    /*@CTK transferOwnership
      @post __reverted == false -> (msg.sender == owner -> __post.owner == _newOwner)
      @post (owner != msg.sender) -> (__reverted == true)
      @post (_newOwner == address(0)) -> (__reverted == true)
    */
    function transferOwnership(address _newOwner) public onlyOwner validAddress(_newOwner) {
        OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
