// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/core/TenderRegistry.sol";
import "../src/core/BidEscrow.sol";
import "../src/core/MilestoneEscrow.sol";
import "../src/oracle/ScoringOracle.sol";
import "../src/oracle/AnomalyOracle.sol";
import "../src/governance/BountyHunter.sol";
import "../src/governance/RatingLedger.sol";
import "../src/governance/GovChainTimelock.sol";
import "../src/zkp/ZKPController.sol";
import "../src/zkp/Groth16Verifier.sol";
import {
    ORACLE_ROLE,
    AUDITOR_ROLE,
    GOVT_ROLE
} from "../src/Types.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address oracleWallet = vm.envOr("ORACLE_WALLET", deployer);
        address auditorWallet = vm.envOr("AUDITOR_WALLET", deployer);
        address govtWallet = vm.envOr("GOVT_WALLET", deployer);
        
        // Sepolia VRF Defaults (can be overridden in .env)
        address vrfCoordinator = vm.envOr("VRF_COORDINATOR", address(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625));
        bytes32 vrfKeyHash = vm.envOr("VRF_KEY_HASH", bytes32(0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c));
        uint64 vrfSubId = uint64(vm.envOr("VRF_SUB_ID", uint256(0))); 
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Timelock (Admin)
        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = deployer;
        GovChainTimelock timelock = new GovChainTimelock(1 days, proposers, executors, deployer);
        console.log("GovChainTimelock deployed to:", address(timelock));

        // For this deployment script, we'll use the deployer as the initial admin 
        // to set up roles, but in production, ownership should be transferred to the timelock.
        address admin = deployer;

        // 2. Deploy ZKP Infrastructure
        Groth16Verifier verifier = new Groth16Verifier();
        console.log("Groth16Verifier deployed to:", address(verifier));

        ZKPController zkpController = new ZKPController();
        zkpController.initialize(admin, address(verifier));
        console.log("ZKPController deployed to:", address(zkpController));

        // 3. Deploy Core Contracts
        TenderRegistry tenderRegistry = new TenderRegistry();
        tenderRegistry.initialize(admin, govtWallet);
        console.log("TenderRegistry deployed to:", address(tenderRegistry));

        BidEscrow bidEscrow = new BidEscrow();
        // Set minimum stake to 0.01 ETH for testing/Sepolia
        bidEscrow.initialize(admin, address(tenderRegistry), 0.01 ether);
        console.log("BidEscrow deployed to:", address(bidEscrow));

        MilestoneEscrow milestoneEscrow = new MilestoneEscrow();
        milestoneEscrow.initialize(admin, address(tenderRegistry));
        console.log("MilestoneEscrow deployed to:", address(milestoneEscrow));

        // 4. Deploy Oracles
        ScoringOracle scoringOracle = new ScoringOracle();
        scoringOracle.initialize(admin, address(tenderRegistry), address(bidEscrow));
        console.log("ScoringOracle deployed to:", address(scoringOracle));

        AnomalyOracle anomalyOracle = new AnomalyOracle();
        anomalyOracle.initialize(admin, address(bidEscrow), address(tenderRegistry));
        console.log("AnomalyOracle deployed to:", address(anomalyOracle));

        // 5. Deploy Governance
        RatingLedger ratingLedger = new RatingLedger();
        ratingLedger.initialize(admin);
        console.log("RatingLedger deployed to:", address(ratingLedger));

        BountyHunter bountyHunter = new BountyHunter(vrfCoordinator);
        // requestConfirmations = 3, callbackGasLimit = 500000
        bountyHunter.initialize(admin, vrfSubId, vrfKeyHash, 3, 500000);
        console.log("BountyHunter deployed to:", address(bountyHunter));

        // 6. Wire Cross-Contract References
        tenderRegistry.setBidEscrowAddress(address(bidEscrow));
        tenderRegistry.setScoringOracleAddress(address(scoringOracle));
        tenderRegistry.setZKPControllerAddress(address(zkpController));
        
        bountyHunter.setMilestoneEscrowAddress(address(milestoneEscrow));

        // 7. Grant Roles
        tenderRegistry.grantRole(ORACLE_ROLE, oracleWallet);
        
        bidEscrow.grantRole(ORACLE_ROLE, oracleWallet);
        // TenderRegistry needs admin on BidEscrow to lockWinnerStake
        bidEscrow.grantRole(bidEscrow.DEFAULT_ADMIN_ROLE(), address(tenderRegistry)); 
        
        scoringOracle.grantRole(ORACLE_ROLE, oracleWallet);
        
        anomalyOracle.grantRole(ORACLE_ROLE, oracleWallet);
        anomalyOracle.grantRole(AUDITOR_ROLE, auditorWallet);
        
        milestoneEscrow.grantRole(GOVT_ROLE, govtWallet);
        // AnomalyOracle needs admin on MilestoneEscrow to freeze/slash funds
        milestoneEscrow.grantRole(milestoneEscrow.DEFAULT_ADMIN_ROLE(), address(anomalyOracle));
        
        ratingLedger.grantRole(ORACLE_ROLE, oracleWallet);
        ratingLedger.grantRole(AUDITOR_ROLE, auditorWallet);
        
        zkpController.grantRole(ORACLE_ROLE, oracleWallet);

        vm.stopBroadcast();

        // 8. Output Configuration
        string memory deploymentInfo = string(abi.encodePacked(
            "GovChainTimelock: ", vm.toString(address(timelock)), "\n",
            "Groth16Verifier: ", vm.toString(address(verifier)), "\n",
            "ZKPController: ", vm.toString(address(zkpController)), "\n",
            "TenderRegistry: ", vm.toString(address(tenderRegistry)), "\n",
            "BidEscrow: ", vm.toString(address(bidEscrow)), "\n",
            "MilestoneEscrow: ", vm.toString(address(milestoneEscrow)), "\n",
            "ScoringOracle: ", vm.toString(address(scoringOracle)), "\n",
            "AnomalyOracle: ", vm.toString(address(anomalyOracle)), "\n",
            "RatingLedger: ", vm.toString(address(ratingLedger)), "\n",
            "BountyHunter: ", vm.toString(address(bountyHunter)), "\n"
        ));
        
        vm.writeFile(string(abi.encodePacked("./deployment-", vm.toString(block.chainid), ".txt")), deploymentInfo);
        console.log("Deployment completed successfully. Saved to: deployment-%s.txt", vm.toString(block.chainid));
    }
}
