pragma solidity ^0.4.17;

import './StandardToken.sol';
import '../libs/Ownable.sol';

contract BodhiToken is StandardToken, Ownable {
    // Token configurations
    string public constant name = "Bodhi Token";
    string public constant symbol = "BOT";
    uint256 public constant decimals = 8;

    uint256 public constant tokenTotalSupply = 100 * (10**6) * (10**decimals); // 100 million BOT ever created

    // Events
    event Mint(uint256 supply, address indexed to, uint256 amount);

    /// @notice Creates new BodhiToken contract
    function BodhiToken() public {
    }

    /// @notice Allows the owner to mint new tokens
    /// @param _to Address to mint the tokens to
    /// @param _amount Amount of tokens that will be minted
    /// @return Boolean to signify successful minting
    function mintByOwner(address _to, uint256 _amount) public onlyOwner returns (bool) {
        return mint(_to, _amount);
    }

    /// @dev Mint new tokens
    /// @param _to Address to mint the tokens to
    /// @param _amount Amount of tokens that will be minted
    /// @return Boolean to signify successful minting
    function mint(address _to, uint256 _amount) internal returns (bool) {
        uint256 checkedSupply = totalSupply.add(_amount);
        require(checkedSupply <= tokenTotalSupply);

        totalSupply += _amount;
        balances[_to] = balances[_to].add(_amount);

        Mint(totalSupply, _to, _amount);

        return true;
    }
}
