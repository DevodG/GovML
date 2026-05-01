// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract TenderRegistry is ReentrancyGuard, Ownable, Pausable {
    struct Tender {
        string title;
        string category;
        uint256 budget;
        uint256 deadline;
        string ipfsDocHash;
        uint8 status;
        address winner;
        uint256 createdAt;
        uint256 biddingClosedAt;
    }

    struct Milestone {
        string name;
        uint256 percentage;
        uint256 daysToComplete;
        bool completed;
        uint256 completedAt;
    }

    uint256 private _tenderCounter;
    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => Milestone[]) public tenderMilestones;
    mapping(address => bool) public governmentAuthorities;

    event TenderCreated(uint256 indexed tenderId, string title, string category, uint256 budget, uint256 deadline, string ipfsDocHash, address indexed createdBy);
    event BiddingClosed(uint256 indexed tenderId, uint256 closedAt);
    event WinnerAllotted(uint256 indexed tenderId, address indexed winner, uint256 allottedAt);
    event GovernmentAuthorityAdded(address indexed authority);

    modifier onlyGovernment() {
        require(governmentAuthorities[msg.sender], "Only government authorities");
        _;
    }

    modifier validTender(uint256 tenderId) {
        require(tenderId > 0 && tenderId <= _tenderCounter, "Invalid tender ID");
        _;
    }

    constructor() Ownable(msg.sender) {
        _tenderCounter = 0;
    }

    function addGovernmentAuthority(address authority) external onlyOwner {
        governmentAuthorities[authority] = true;
        emit GovernmentAuthorityAdded(authority);
    }

    function createTender(
        string calldata title,
        string calldata category,
        uint256 budget,
        uint256 deadline,
        string calldata ipfsDocHash,
        Milestone[] calldata milestones
    ) external onlyGovernment whenNotPaused nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(budget > 0, "Budget required");
        require(deadline > block.timestamp, "Invalid deadline");
        require(milestones.length > 0, "Milestones required");

        _tenderCounter++;
        uint256 tenderId = _tenderCounter;

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            totalPercentage += milestones[i].percentage;
        }
        require(totalPercentage == 100, "Percentages must sum to 100");

        tenders[tenderId] = Tender({
            title: title,
            category: category,
            budget: budget,
            deadline: deadline,
            ipfsDocHash: ipfsDocHash,
            status: 1, // Open
            winner: address(0),
            createdAt: block.timestamp,
            biddingClosedAt: 0
        });

        for (uint256 i = 0; i < milestones.length; i++) {
            tenderMilestones[tenderId].push(Milestone({
                name: milestones[i].name,
                percentage: milestones[i].percentage,
                daysToComplete: milestones[i].daysToComplete,
                completed: false,
                completedAt: 0
            }));
        }

        emit TenderCreated(tenderId, title, category, budget, deadline, ipfsDocHash, msg.sender);
        return tenderId;
    }

    function closeBidding(uint256 tenderId) external onlyGovernment validTender(tenderId) {
        require(tenders[tenderId].status == 1, "Tender not open");
        tenders[tenderId].status = 2; // BiddingClosed
        tenders[tenderId].biddingClosedAt = block.timestamp;
        emit BiddingClosed(tenderId, block.timestamp);
    }

    function allotWinner(uint256 tenderId, address winner) external onlyGovernment validTender(tenderId) {
        require(tenders[tenderId].status == 2, "Bidding not closed");
        require(winner != address(0), "Invalid winner");
        tenders[tenderId].status = 3; // Allotted
        tenders[tenderId].winner = winner;
        emit WinnerAllotted(tenderId, winner, block.timestamp);
    }

    function getTender(uint256 tenderId) external view validTender(tenderId) returns (Tender memory) {
        return tenders[tenderId];
    }

    function getMilestones(uint256 tenderId) external view validTender(tenderId) returns (Milestone[] memory) {
        return tenderMilestones[tenderId];
    }

    function getTenderCount() external view returns (uint256) {
        return _tenderCounter;
    }
}
