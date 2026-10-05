// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {EndaomentRegistryStandIn} from "../../src/testnet/EndaomentRegistryStandIn.sol";
import {TestnetOnly} from "../../src/testnet/TestnetOnly.sol";

/// @title EndaomentRegistryStandIn unit suite (Epic 8)
/// @notice The stand-in exposes exactly the registry surface the router fork
///         suites read (`getDonationFeeWithOverrides`, `treasury`), so
///         `DeployedRouterFork.t.sol` can verify a Base Sepolia demo deployment.
contract EndaomentRegistryStandInTest is Test {
    address internal feeRecipient;

    function setUp() public {
        feeRecipient = makeAddr("endaoment-fee-recipient");
    }

    function test_Constructor_StoresTreasury() public {
        EndaomentRegistryStandIn registry = new EndaomentRegistryStandIn(feeRecipient);
        assertEq(registry.treasury(), feeRecipient, "treasury not stored");
    }

    function test_Constructor_RevertsOnZeroTreasury() public {
        vm.expectRevert(EndaomentRegistryStandIn.ZeroAddress.selector);
        new EndaomentRegistryStandIn(address(0));
    }

    function test_DonationFee_Is150ZocForAnyEntity() public {
        EndaomentRegistryStandIn registry = new EndaomentRegistryStandIn(feeRecipient);
        assertEq(registry.getDonationFeeWithOverrides(address(0xBEEF)), 150, "fee must mirror Endaoment's 1.5%");
        assertEq(registry.getDonationFeeWithOverrides(address(this)), 150, "fee must not depend on the entity");
    }

    function test_Constructor_RevertsOnBaseMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(abi.encodeWithSelector(TestnetOnly.MainnetNotAllowed.selector, 8453));
        new EndaomentRegistryStandIn(feeRecipient);
    }

    function test_Constructor_RevertsOnEthereumMainnet() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(TestnetOnly.MainnetNotAllowed.selector, 1));
        new EndaomentRegistryStandIn(feeRecipient);
    }

    function test_Constructor_AllowsBaseSepolia() public {
        vm.chainId(84532);
        EndaomentRegistryStandIn registry = new EndaomentRegistryStandIn(feeRecipient);
        assertEq(registry.treasury(), feeRecipient, "Base Sepolia deploy should succeed");
    }
}
