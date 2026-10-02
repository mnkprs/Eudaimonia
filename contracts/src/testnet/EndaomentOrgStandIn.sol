// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEndaomentEntity} from "../interfaces/IEndaomentEntity.sol";
import {EndaomentRegistryStandIn} from "./EndaomentRegistryStandIn.sol";
import {TestnetOnly} from "./TestnetOnly.sol";

/// @title EndaomentOrgStandIn — TESTNET ONLY, not Endaoment
/// @notice Plays one charity's Endaoment Org entity in the Base Sepolia demo.
///         It is NOT affiliated with Endaoment or the named charity; nothing
///         it holds is real money.
/// @dev `donate` copies Endaoment's pull model
///      (endaoment-contracts-v2 `Entity._donateWithFeeMultiplier`): the fee is
///      pulled to the registry treasury first, then the remainder into the
///      entity, both from the caller's single allowance. That keeps the router's
///      on-chain footprint — and therefore the receipt decoder's view of it —
///      identical to a real Endaoment donation.
contract EndaomentOrgStandIn is IEndaomentEntity, TestnetOnly {
    using SafeERC20 for IERC20;

    uint256 internal constant ZOC = 10_000;

    /// @notice Token this entity accepts (Circle test USDC on Base Sepolia).
    IERC20 public immutable baseToken;

    /// @notice Registry stand-in that sets the donation fee and its recipient.
    EndaomentRegistryStandIn public immutable registry;

    /// @notice May move test USDC out, so the demo wallet can be refilled
    ///         without waiting on faucet cooldowns.
    address public immutable manager;

    /// @notice Human-readable label, e.g. "TESTNET STAND-IN (not Endaoment): <charity>".
    string public name;

    /// @notice Same shape as Endaoment's `Entity.EntityDonationReceived`.
    event EntityDonationReceived(
        address indexed from,
        address indexed to,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountReceived,
        uint256 amountFee
    );

    /// @notice Emitted when the manager recycles test USDC out of the stand-in.
    event StandInWithdrawal(address indexed to, uint256 amount);

    error ZeroAddress();
    error NotManager(address caller);

    constructor(IERC20 _baseToken, EndaomentRegistryStandIn _registry, address _manager, string memory _name) {
        if (address(_baseToken) == address(0) || address(_registry) == address(0) || _manager == address(0)) {
            revert ZeroAddress();
        }
        baseToken = _baseToken;
        registry = _registry;
        manager = _manager;
        name = _name;
    }

    /// @inheritdoc IEndaomentEntity
    function donate(uint256 amount) external override {
        uint256 fee = (amount * registry.getDonationFeeWithOverrides(address(this))) / ZOC;
        baseToken.safeTransferFrom(msg.sender, registry.treasury(), fee);
        baseToken.safeTransferFrom(msg.sender, address(this), amount - fee);
        emit EntityDonationReceived(msg.sender, address(this), address(baseToken), amount, amount, fee);
    }

    /// @notice Moves `amount` of test USDC to `to`. Manager only.
    function withdraw(address to, uint256 amount) external {
        if (msg.sender != manager) revert NotManager(msg.sender);
        if (to == address(0)) revert ZeroAddress();
        baseToken.safeTransfer(to, amount);
        emit StandInWithdrawal(to, amount);
    }
}
