// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title TestnetOnly
/// @notice Construction guard for the Epic 8 demo stand-ins: they imitate
///         Endaoment contracts, so they must never exist on a mainnet where a
///         donor could mistake them for the real thing.
abstract contract TestnetOnly {
    uint256 internal constant ETHEREUM_MAINNET_CHAIN_ID = 1;
    uint256 internal constant BASE_MAINNET_CHAIN_ID = 8453;

    /// @notice Raised when a stand-in is constructed on a mainnet.
    error MainnetNotAllowed(uint256 chainId);

    constructor() {
        if (block.chainid == ETHEREUM_MAINNET_CHAIN_ID || block.chainid == BASE_MAINNET_CHAIN_ID) {
            revert MainnetNotAllowed(block.chainid);
        }
    }
}
