pragma solidity ^0.4.15;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  /*@CTK init_migrations
    @post __post.owner == msg.sender
  */
  function Migrations() public {
    owner = msg.sender;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }

  /*@CTK set_complete
    @pre msg.sender == owner
    @post __post.last_completed_migration == completed
  */
  function upgrade(address new_address) public restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
