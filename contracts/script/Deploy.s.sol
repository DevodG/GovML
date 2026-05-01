// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TenderRegistry.sol";
import "../src/BidEscrow.sol";
import "../src/MilestoneEscrow.sol";
import "../src/ScoringOracle.sol";
import "../src/BountyHunter.sol";
import "../src/RatingLedger.sol";
import "../src/AnomalyOracle.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy contracts
        TenderRegistry tenderRegistry = new TenderRegistry();
        console.log("TenderRegistry deployed to:", address(tenderRegistry));

        BidEscrow bidEscrow = new BidEscrow(address(0)); // Will set token address later
        console.log("BidEscrow deployed to:", address(bidEscrow));

        MilestoneEscrow milestoneEscrow = new MilestoneEscrow(address(0)); // Will set token address later
        console.log("MilestoneEscrow deployed to:", address(milestoneEscrow));

        ScoringOracle scoringOracle = new ScoringOracle();
        console.log("ScoringOracle deployed to:", address(scoringOracle));

        BountyHunter bountyHunter = new BountyHunter(address(0)); // Will set token address later
        console.log("BountyHunter deployed to:", address(bountyHunter));

        RatingLedger ratingLedger = new RatingLedger();
        console.log("RatingLedger deployed to:", address(ratingLedger));

        AnomalyOracle anomalyOracle = new AnomalyOracle();
        console.log("AnomalyOracle deployed to:", address(anomalyOracle));

        // Setup government authority
        tenderRegistry.addGovernmentAuthority(deployer);
        console.log("Added deployer as government authority");

        vm.stopBroadcast();

        // Save deployment addresses
        string memory deploymentInfo = string(abi.encodePacked(
            "TenderRegistry: ", vm.toString(address(tenderRegistry)), "\n",
            "BidEscrow: ", vm.toString(address(bidEscrow)), "\n",
            "MilestoneEscrow: ", vm.toString(address(milestoneEscrow)), "\n",
            "ScoringOracle: ", vm.toString(address(scoringOracle)), "\n",
            "BountyHunter: ", vm.toString(address(bountyHunter)), "\n",
            "RatingLedger: ", vm.toString(address(ratingLedger)), "\n",
            "AnomalyOracle: ", vm.toString(address(anomalyOracle))
        ));
        
        vm.writeFile(string(abi.encodePacked("./deployment-", vm.toString(block.chainid), ".txt")), deploymentInfo);
    }
}
