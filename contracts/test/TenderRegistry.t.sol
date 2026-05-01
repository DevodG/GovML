// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TenderRegistry.sol";

contract TenderRegistryTest is Test {
    TenderRegistry public tenderRegistry;
    address public government;
    address public contractor;

    function setUp() public {
        government = address(this);
        contractor = address(0x1);
        
        tenderRegistry = new TenderRegistry();
        tenderRegistry.addGovernmentAuthority(government);
    }

    function testCreateTender() public {
        TenderRegistry.Milestone[] memory milestones = new TenderRegistry.Milestone[](1);
        milestones[0] = TenderRegistry.Milestone({
            name: "Foundation",
            percentage: 100,
            daysToComplete: 30,
            completed: false,
            completedAt: 0
        });

        uint256 tenderId = tenderRegistry.createTender(
            "Road Construction",
            "Infrastructure",
            1000000,
            block.timestamp + 30 days,
            "QmTest123",
            milestones
        );

        assertEq(tenderId, 1);
        
        TenderRegistry.Tender memory tender = tenderRegistry.getTender(tenderId);
        assertEq(tender.title, "Road Construction");
        assertEq(tender.budget, 1000000);
    }

    function testOnlyGovernmentCanCreateTender() public {
        TenderRegistry.Milestone[] memory milestones = new TenderRegistry.Milestone[](1);
        milestones[0] = TenderRegistry.Milestone({
            name: "Foundation",
            percentage: 100,
            daysToComplete: 30,
            completed: false,
            completedAt: 0
        });

        vm.prank(contractor);
        vm.expectRevert("Only government authorities");
        tenderRegistry.createTender(
            "Road Construction",
            "Infrastructure",
            1000000,
            block.timestamp + 30 days,
            "QmTest123",
            milestones
        );
    }
}
