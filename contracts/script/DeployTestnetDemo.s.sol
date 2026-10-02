// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TransparentDonationRouter} from "../src/TransparentDonationRouter.sol";
import {EndaomentOrgStandIn} from "../src/testnet/EndaomentOrgStandIn.sol";
import {EndaomentRegistryStandIn} from "../src/testnet/EndaomentRegistryStandIn.sol";

/// @title DeployTestnetDemo — one-shot Base Sepolia demo stack (Epic 8)
/// @notice Deploys the Endaoment registry stand-in, one org stand-in per
///         launch charity, and the router, then allowlists the three orgs —
///         all from the owner account in a single broadcast.
/// @dev Usage (operator action — not run in CI):
///        USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
///        TREASURY_ADDRESS=0x… OWNER_ADDRESS=0x… \
///        forge script script/DeployTestnetDemo.s.sol:DeployTestnetDemo \
///          --rpc-url base_sepolia --account <owner-keystore> --broadcast
///      `OWNER_ADDRESS` must be the broadcasting account: it owns the router
///      (so it can allowlist), manages the stand-ins, and receives the
///      stand-in Endaoment fee.
contract DeployTestnetDemo is Script {
    uint256 internal constant BASE_SEPOLIA_CHAIN_ID = 84532;
    string internal constant NAME_PREFIX = "TESTNET STAND-IN (not Endaoment): ";

    struct DemoConfig {
        address usdc;
        address treasury;
        address owner;
    }

    struct DemoDeployment {
        TransparentDonationRouter router;
        EndaomentRegistryStandIn registry;
        EndaomentOrgStandIn pcrf;
        EndaomentOrgStandIn wck;
        EndaomentOrgStandIn directRelief;
    }

    /// @notice Raised when the script targets anything but Base Sepolia.
    error WrongChain(uint256 chainId);

    /// @notice Reads config from env, refuses non-Sepolia chains, broadcasts
    ///         the stack, and logs ready-to-paste env lines.
    function run() external returns (DemoDeployment memory d) {
        if (block.chainid != BASE_SEPOLIA_CHAIN_ID) revert WrongChain(block.chainid);

        DemoConfig memory cfg = DemoConfig({
            usdc: vm.envAddress("USDC_ADDRESS"),
            treasury: vm.envAddress("TREASURY_ADDRESS"),
            owner: vm.envAddress("OWNER_ADDRESS")
        });

        vm.startBroadcast(cfg.owner);
        d = _deployAll(cfg);
        vm.stopBroadcast();

        _logEnv(d);
    }

    function _deployAll(DemoConfig memory cfg) internal returns (DemoDeployment memory d) {
        IERC20 usdc = IERC20(cfg.usdc);
        d.registry = new EndaomentRegistryStandIn(cfg.owner);
        d.pcrf = _deployOrg(usdc, d.registry, cfg.owner, "Palestine Children's Relief Fund");
        d.wck = _deployOrg(usdc, d.registry, cfg.owner, "World Central Kitchen");
        d.directRelief = _deployOrg(usdc, d.registry, cfg.owner, "Direct Relief");

        d.router = new TransparentDonationRouter(cfg.usdc, cfg.treasury, cfg.owner);
        d.router.setOrgAllowed(address(d.pcrf), true);
        d.router.setOrgAllowed(address(d.wck), true);
        d.router.setOrgAllowed(address(d.directRelief), true);
    }

    function _deployOrg(IERC20 usdc, EndaomentRegistryStandIn registry, address owner, string memory charity)
        internal
        returns (EndaomentOrgStandIn)
    {
        return new EndaomentOrgStandIn(usdc, registry, owner, string.concat(NAME_PREFIX, charity));
    }

    function _logEnv(DemoDeployment memory d) internal pure {
        console2.log(string.concat("NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA=", vm.toString(address(d.router))));
        console2.log(string.concat("ROUTER_ADDRESS_BASE_SEPOLIA=", vm.toString(address(d.router))));
        console2.log(string.concat("STANDIN_REGISTRY=", vm.toString(address(d.registry))));
        console2.log(string.concat("STANDIN_PCRF=", vm.toString(address(d.pcrf))));
        console2.log(string.concat("STANDIN_WCK=", vm.toString(address(d.wck))));
        console2.log(string.concat("STANDIN_DIRECTRELIEF=", vm.toString(address(d.directRelief))));
    }
}
