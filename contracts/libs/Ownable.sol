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

    // Events
    event OwnershipTransferred(address indexed _previousOwner, address indexed _newOwner);

    /// @dev The Ownable constructor sets the original `owner` of the contract to the sender account.
    function Ownable() {
        owner = msg.sender;
    }

    /// @dev Allows the current owner to transfer control of the contract to a newOwner.
    /// @param newOwner The address to transfer ownership to.
    function transferOwnership(address _newOwner) onlyOwner {
        require(newOwner != address(0));
        OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
