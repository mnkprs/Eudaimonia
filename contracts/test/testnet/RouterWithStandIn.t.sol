// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TransparentDonationRouter} from "../../src/TransparentDonationRouter.sol";
import {EndaomentOrgStandIn} from "../../src/testnet/EndaomentOrgStandIn.sol";
import {EndaomentRegistryStandIn} from "../../src/testnet/EndaomentRegistryStandIn.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

/// @title Router × stand-in integration (Epic 8)
/// @notice Pins the exact on-chain footprint of a demo donation, because the
///         TS receipt pipeline (`decodeRouterReceipt`, `verifyDonation`) reads
///         these Transfer legs and the `DonationRouted` event from one tx.
contract RouterWithStandInTest is Test {
    uint256 internal constant GROSS = 1_000_000; // $1 test USDC
    uint256 internal constant PLATFORM_FEE = 10_000; // 1%
    uint256 internal constant NET = 990_000;
    uint256 internal constant ENDAOMENT_FEE = 14_850; // 1.5% of NET
    uint256 internal constant ORG_CREDIT = 975_150;

    bytes32 internal constant TRANSFER_TOPIC = keccak256("Transfer(address,address,uint256)");
    bytes32 internal constant DONATION_ROUTED_TOPIC =
        keccak256("DonationRouted(address,address,uint256,uint256,uint256)");

    MockERC20 internal token;
    TransparentDonationRouter internal router;
    EndaomentOrgStandIn internal org;
    address internal treasury;
    address internal endaomentFeeRecipient;
    address internal donor;

    function setUp() public {
        token = new MockERC20();
        treasury = makeAddr("platform-treasury");
        endaomentFeeRecipient = makeAddr("endaoment-fee-recipient");
        donor = makeAddr("demo-wallet");

        EndaomentRegistryStandIn registry = new EndaomentRegistryStandIn(endaomentFeeRecipient);
        org = new EndaomentOrgStandIn(
            IERC20(address(token)), registry, address(this), "TESTNET STAND-IN (not Endaoment): PCRF"
        );
        router = new TransparentDonationRouter(address(token), treasury, address(this));
        router.setOrgAllowed(address(org), true);

        token.mint(donor, GROSS);
        vm.prank(donor);
        token.approve(address(router), type(uint256).max);
    }

    function test_Donate_SplitsAcrossPlatformEndaomentFeeAndOrg() public {
        vm.prank(donor);
        router.donate(address(org), GROSS);

        assertEq(token.balanceOf(treasury), PLATFORM_FEE, "platform treasury should get 1%");
        assertEq(token.balanceOf(endaomentFeeRecipient), ENDAOMENT_FEE, "stand-in fee should be 1.5% of net");
        assertEq(token.balanceOf(address(org)), ORG_CREDIT, "org should get the rest");
        assertEq(token.balanceOf(address(router)), 0, "router must not retain funds");
        assertEq(token.allowance(address(router), address(org)), 0, "no residual router allowance");
    }

    function test_Donate_EmitsTransferLegsInDecoderOrderThenDonationRouted() public {
        vm.recordLogs();
        vm.prank(donor);
        router.donate(address(org), GROSS);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        address[4] memory froms = [donor, address(router), address(router), address(router)];
        address[4] memory tos = [address(router), treasury, endaomentFeeRecipient, address(org)];
        uint256[4] memory values = [GROSS, PLATFORM_FEE, ENDAOMENT_FEE, ORG_CREDIT];

        uint256 transferIndex;
        uint256 routedIndex = type(uint256).max;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == TRANSFER_TOPIC) {
                assertLt(transferIndex, 4, "unexpected extra Transfer");
                assertEq(address(uint160(uint256(logs[i].topics[1]))), froms[transferIndex], "Transfer from");
                assertEq(address(uint160(uint256(logs[i].topics[2]))), tos[transferIndex], "Transfer to");
                assertEq(abi.decode(logs[i].data, (uint256)), values[transferIndex], "Transfer value");
                transferIndex++;
            } else if (logs[i].topics[0] == DONATION_ROUTED_TOPIC) {
                routedIndex = i;
                assertEq(logs[i].emitter, address(router), "DonationRouted must come from the router");
            }
        }

        assertEq(transferIndex, 4, "expected exactly four Transfer legs");
        assertEq(routedIndex, logs.length - 1, "DonationRouted should be the final log");
    }
}
