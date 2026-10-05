// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployTestnetDemo} from "../script/DeployTestnetDemo.s.sol";
import {EndaomentOrgStandIn} from "../src/testnet/EndaomentOrgStandIn.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @title DeployTestnetDemo script suite (Epic 8)
/// @notice The demo stack is one broadcast: registry + three stand-in orgs +
///         router + allowlist. These tests run the real `run()` entrypoint
///         (broadcast behaves like a prank under `forge test`).
contract DeployTestnetDemoTest is Test {
    uint256 internal constant BASE_SEPOLIA = 84532;

    DeployTestnetDemo internal script;
    MockERC20 internal token;
    address internal treasury;
    address internal owner;

    function setUp() public {
        script = new DeployTestnetDemo();
        token = new MockERC20();
        treasury = makeAddr("platform-treasury");
        owner = makeAddr("owner");
        vm.setEnv("USDC_ADDRESS", vm.toString(address(token)));
        vm.setEnv("TREASURY_ADDRESS", vm.toString(treasury));
        vm.setEnv("OWNER_ADDRESS", vm.toString(owner));
    }

    function test_Run_RevertsOnBaseMainnet() public {
        vm.chainId(8453);
        vm.expectRevert(abi.encodeWithSelector(DeployTestnetDemo.WrongChain.selector, 8453));
        script.run();
    }

    function test_Run_RevertsOnLocalChain() public {
        vm.expectRevert(abi.encodeWithSelector(DeployTestnetDemo.WrongChain.selector, block.chainid));
        script.run();
    }

    function test_Run_DeploysRouterWithConfiguredImmutables() public {
        vm.chainId(BASE_SEPOLIA);
        DeployTestnetDemo.DemoDeployment memory d = script.run();

        assertEq(address(d.router.usdc()), address(token), "router usdc");
        assertEq(d.router.treasury(), treasury, "router treasury");
        assertEq(d.router.owner(), owner, "router owner");
        assertEq(d.registry.treasury(), owner, "stand-in Endaoment fee goes to the owner");
    }

    function test_Run_DeploysAndAllowlistsThreeStandIns() public {
        vm.chainId(BASE_SEPOLIA);
        DeployTestnetDemo.DemoDeployment memory d = script.run();

        EndaomentOrgStandIn[3] memory orgs = [d.pcrf, d.wck, d.directRelief];
        for (uint256 i = 0; i < orgs.length; i++) {
            assertEq(address(orgs[i].baseToken()), address(token), "org base token");
            assertEq(address(orgs[i].registry()), address(d.registry), "org registry");
            assertEq(orgs[i].manager(), owner, "org manager");
            assertTrue(d.router.allowedOrgs(address(orgs[i])), "org not allowlisted");
        }
        assertEq(d.pcrf.name(), "TESTNET STAND-IN (not Endaoment): Palestine Children's Relief Fund");
        assertEq(d.wck.name(), "TESTNET STAND-IN (not Endaoment): World Central Kitchen");
        assertEq(d.directRelief.name(), "TESTNET STAND-IN (not Endaoment): Direct Relief");
    }

    function test_Run_DeployedStackAcceptsADonation() public {
        vm.chainId(BASE_SEPOLIA);
        DeployTestnetDemo.DemoDeployment memory d = script.run();
        address donor = makeAddr("demo-wallet");
        token.mint(donor, 1_000_000);

        vm.startPrank(donor);
        token.approve(address(d.router), 1_000_000);
        d.router.donate(address(d.wck), 1_000_000);
        vm.stopPrank();

        assertEq(token.balanceOf(treasury), 10_000, "platform fee");
        assertEq(token.balanceOf(address(d.wck)), 975_150, "org credit");
    }
}
