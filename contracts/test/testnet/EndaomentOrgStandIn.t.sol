// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {EndaomentOrgStandIn} from "../../src/testnet/EndaomentOrgStandIn.sol";
import {EndaomentRegistryStandIn} from "../../src/testnet/EndaomentRegistryStandIn.sol";
import {TestnetOnly} from "../../src/testnet/TestnetOnly.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

/// @title EndaomentOrgStandIn unit suite (Epic 8)
/// @notice Pins the stand-in to Endaoment's real `Entity.donate` pull model
///         (src/Entity.sol `_donateWithFeeMultiplier`): fee → registry
///         treasury first, remainder → the entity, both pulled from the caller.
contract EndaomentOrgStandInTest is Test {
    string internal constant NAME = "TESTNET STAND-IN (not Endaoment): World Central Kitchen";

    MockERC20 internal token;
    EndaomentRegistryStandIn internal registry;
    EndaomentOrgStandIn internal org;
    address internal feeRecipient;
    address internal manager;
    address internal donor;

    /// @dev Mirrors the contract's event so `vm.expectEmit` has a typed reference.
    event EntityDonationReceived(
        address indexed from,
        address indexed to,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountReceived,
        uint256 amountFee
    );
    event StandInWithdrawal(address indexed to, uint256 amount);

    function setUp() public {
        token = new MockERC20();
        feeRecipient = makeAddr("endaoment-fee-recipient");
        manager = makeAddr("manager");
        donor = makeAddr("donor");
        registry = new EndaomentRegistryStandIn(feeRecipient);
        org = new EndaomentOrgStandIn(IERC20(address(token)), registry, manager, NAME);
    }

    function _fundAndApprove(uint256 amount) internal {
        token.mint(donor, amount);
        vm.prank(donor);
        token.approve(address(org), amount);
    }

    // --- constructor ------------------------------------------------------------

    function test_Constructor_WiresImmutablesAndName() public view {
        assertEq(address(org.baseToken()), address(token), "baseToken not stored");
        assertEq(address(org.registry()), address(registry), "registry not stored");
        assertEq(org.manager(), manager, "manager not stored");
        assertEq(org.name(), NAME, "name not stored");
    }

    function test_Constructor_RevertsOnZeroToken() public {
        vm.expectRevert(EndaomentOrgStandIn.ZeroAddress.selector);
        new EndaomentOrgStandIn(IERC20(address(0)), registry, manager, NAME);
    }

    function test_Constructor_RevertsOnZeroRegistry() public {
        vm.expectRevert(EndaomentOrgStandIn.ZeroAddress.selector);
        new EndaomentOrgStandIn(IERC20(address(token)), EndaomentRegistryStandIn(address(0)), manager, NAME);
    }

    function test_Constructor_RevertsOnZeroManager() public {
        vm.expectRevert(EndaomentOrgStandIn.ZeroAddress.selector);
        new EndaomentOrgStandIn(IERC20(address(token)), registry, address(0), NAME);
    }

    function test_Constructor_RevertsOnBaseMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(abi.encodeWithSelector(TestnetOnly.MainnetNotAllowed.selector, 8453));
        new EndaomentOrgStandIn(IERC20(address(token)), registry, manager, NAME);
    }

    // --- donate -------------------------------------------------------------------

    /// @dev Same numbers as the TS receipt fixtures (src/lib/receipt/fixtures.ts):
    ///      a $1 gross routes net 990_000; Endaoment's 1.5% of that is 14_850.
    function test_Donate_PullsFeeToRegistryTreasuryAndRemainderToSelf() public {
        _fundAndApprove(990_000);

        vm.prank(donor);
        org.donate(990_000);

        assertEq(token.balanceOf(feeRecipient), 14_850, "fee recipient should get 1.5%");
        assertEq(token.balanceOf(address(org)), 975_150, "org should keep the remainder");
        assertEq(token.balanceOf(donor), 0, "donor should be fully debited");
        assertEq(token.allowance(donor, address(org)), 0, "both pulls must draw the same allowance");
    }

    function test_Donate_EmitsEntityDonationReceived() public {
        _fundAndApprove(990_000);

        vm.expectEmit(true, true, true, true, address(org));
        emit EntityDonationReceived(donor, address(org), address(token), 990_000, 990_000, 14_850);

        vm.prank(donor);
        org.donate(990_000);
    }

    function test_Donate_RevertsWhenAllowanceShort() public {
        token.mint(donor, 990_000);
        vm.prank(donor);
        token.approve(address(org), 1_000);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(org), 1_000, 14_850)
        );
        vm.prank(donor);
        org.donate(990_000);
    }

    function testFuzz_Donate_FeeAndRemainderConserveAmount(uint256 amount) public {
        amount = bound(amount, 1, 1e15);
        _fundAndApprove(amount);

        vm.prank(donor);
        org.donate(amount);

        uint256 expectedFee = (amount * 150) / 10_000;
        assertEq(token.balanceOf(feeRecipient), expectedFee, "fee must be 150 zoc, rounded down");
        assertEq(token.balanceOf(feeRecipient) + token.balanceOf(address(org)), amount, "fee + remainder == amount");
    }

    // --- withdraw (recycles test USDC back to the demo wallet) ----------------------

    function test_Withdraw_ManagerMovesFunds() public {
        token.mint(address(org), 500_000);
        address demoWallet = makeAddr("demo-wallet");

        vm.expectEmit(true, false, false, true, address(org));
        emit StandInWithdrawal(demoWallet, 400_000);

        vm.prank(manager);
        org.withdraw(demoWallet, 400_000);

        assertEq(token.balanceOf(demoWallet), 400_000, "recipient not credited");
        assertEq(token.balanceOf(address(org)), 100_000, "org not debited");
    }

    function test_Withdraw_RevertsForNonManager() public {
        token.mint(address(org), 500_000);

        vm.expectRevert(abi.encodeWithSelector(EndaomentOrgStandIn.NotManager.selector, donor));
        vm.prank(donor);
        org.withdraw(donor, 1);
    }

    function test_Withdraw_RevertsOnZeroRecipient() public {
        token.mint(address(org), 500_000);

        vm.expectRevert(EndaomentOrgStandIn.ZeroAddress.selector);
        vm.prank(manager);
        org.withdraw(address(0), 1);
    }
}
