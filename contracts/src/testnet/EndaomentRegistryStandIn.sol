// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TestnetOnly} from "./TestnetOnly.sol";

/// @title EndaomentRegistryStandIn — TESTNET ONLY, not Endaoment
/// @notice Stand-in for the slice of Endaoment's Registry that an Entity's
///         `donate` reads: the donation fee and the treasury it is paid to.
/// @dev Exists because Endaoment's Base Sepolia deployment uses a
///      non-mintable mock base token, so its real entities cannot receive
///      Circle's test USDC (see `prompts/epic-8-testnet-demo-plan.md`).
///      The fee mirrors Endaoment's live Base value (150 zoc = 1.5%, read from
///      `getDonationFeeWithOverrides` on 2026-08-19), so receipts built on the
///      demo show the same fee legs as a real donation would.
contract EndaomentRegistryStandIn is TestnetOnly {
    /// @notice Donation fee in zoc (parts per 10,000), matching Endaoment's Base registry.
    uint32 public constant DONATION_FEE_ZOC = 150;

    /// @notice Recipient of the stand-in Endaoment donation fee.
    address public immutable treasury;

    /// @notice Raised when the treasury is the zero address.
    error ZeroAddress();

    constructor(address _treasury) {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    /// @notice Same signature as Endaoment's Registry; the stand-in charges a
    ///         flat fee with no per-entity overrides.
    function getDonationFeeWithOverrides(address) external pure returns (uint32) {
        return DONATION_FEE_ZOC;
    }
}
