// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TenderRegistry
 * @dev Manages tender lifecycle: creation, bidding, closing, and winner allotment
 * @notice Core contract for government tender management on GovChain
 */
contract TenderRegistry is ReentrancyGuard, Ownable, Pausable {
    // Structs
    struct Tender {
        string title;
        string category;
        uint256 budget;
        uint256 deadline;
        string ipfsDocHash;
        TenderStatus status;
        address winner;
        uint256 createdAt;
        uint256 biddingClosedAt;
    }

    struct Milestone {
        string name;
        uint256 percentage; // Percentage of total budget
        uint256 daysToComplete;
        bool completed;
        uint256 completedAt;
    }

    enum TenderStatus {
        Draft,
        Open,
        BiddingClosed,
        Allotted,
        InProgress,
        Completed,
        Cancelled
    }

    // State variables
    uint256 private _tenderCounter;
    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => Milestone[]) public tenderMilestones;
    mapping(address => bool) public governmentAuthorities;

    // Events
    event TenderCreated(
        uint256 indexed tenderId,
        string title,
        string category,
        uint256 budget,
        uint256 deadline,
        string ipfsDocHash,
        address indexed createdBy
    );
    event TenderUpdated(uint256 indexed tenderId, string ipfsDocHash);
    event BiddingClosed(uint256 indexed tenderId, uint256 closedAt);
    event WinnerAllotted(
        uint256 indexed tenderId,
        address indexed winner,
        uint256 allottedAt
    );
    event TenderStatusChanged(
        uint256 indexed tenderId,
        TenderStatus oldStatus,
        TenderStatus newStatus
    );
    event GovernmentAuthorityAdded(address indexed authority);
    event GovernmentAuthorityRemoved(address indexed authority);

    // Modifiers
    modifier onlyGovernment() {
        require(
            governmentAuthorities[msg.sender],
            "Only government authorities can perform this action"
        );
        _;
    }

    modifier validTender(uint256 tenderId) {
        require(tenderId > 0 && tenderId <= _tenderCounter, "Invalid tender ID");
        _;
    }

    modifier onlyOpenTender(uint256 tenderId) {
        require(
            tenders[tenderId].status == TenderStatus.Open,
            "Tender is not open for bidding"
        );
        _;
    }

    // Constructor
    constructor() Ownable(msg.sender) {
        _tenderCounter = 0;
    }

    // Government Authority Management
    function addGovernmentAuthority(address authority) external onlyOwner {
        require(authority != address(0), "Invalid address");
        require(!governmentAuthorities[authority], "Authority already exists");
        
        governmentAuthorities[authority] = true;
        emit GovernmentAuthorityAdded(authority);
    }

    function removeGovernmentAuthority(address authority) external onlyOwner {
        require(governmentAuthorities[authority], "Authority does not exist");
        
        governmentAuthorities[authority] = false;
        emit GovernmentAuthorityRemoved(authority);
    }

    // Tender Creation
    function createTender(
        string calldata title,
        string calldata category,
        uint256 budget,
        uint256 deadline,
        string calldata ipfsDocHash,
        Milestone[] calldata milestones
    ) external onlyGovernment whenNotPaused nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(category).length > 0, "Category cannot be empty");
        require(budget > 0, "Budget must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(ipfsDocHash).length > 0, "IPFS hash cannot be empty");
        require(milestones.length > 0, "At least one milestone required");

        _tenderCounter++;
        uint256 tenderId = _tenderCounter;

        // Validate milestone percentages sum to 100
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            totalPercentage += milestones[i].percentage;
        }
        require(totalPercentage == 100, "Milestone percentages must sum to 100");

        // Create tender
        tenders[tenderId] = Tender({
            title: title,
            category: category,
            budget: budget,
            deadline: deadline,
            ipfsDocHash: ipfsDocHash,
            status: TenderStatus.Open,
            winner: address(0),
            createdAt: block.timestamp,
            biddingClosedAt: 0
        });

        // Store milestones
        for (uint256 i = 0; i < milestones.length; i++) {
            tenderMilestones[tenderId].push(
                Milestone({
                    name: milestones[i].name,
                    percentage: milestones[i].percentage,
                    daysToComplete: milestones[i].daysToComplete,
                    completed: false,
                    completedAt: 0
                })
            );
        }

        emit TenderCreated(
            tenderId,
            title,
            category,
            budget,
            deadline,
            ipfsDocHash,
            msg.sender
        );

        return tenderId;
    }

    // Tender Update (only before bidding closes)
    function updateTender(
        uint256 tenderId,
        string calldata ipfsDocHash
    ) external onlyGovernment validTender(tenderId) onlyOpenTender(tenderId) {
        require(bytes(ipfsDocHash).length > 0, "IPFS hash cannot be empty");

        tenders[tenderId].ipfsDocHash = ipfsDocHash;

        emit TenderUpdated(tenderId, ipfsDocHash);
    }

    // Close Bidding
    function closeBidding(uint256 tenderId)
        external
        onlyGovernment
        validTender(tenderId)
        onlyOpenTender(tenderId)
    {
        TenderStatus oldStatus = tenders[tenderId].status;
        
        tenders[tenderId].status = TenderStatus.BiddingClosed;
        tenders[tenderId].biddingClosedAt = block.timestamp;

        emit TenderStatusChanged(tenderId, oldStatus, TenderStatus.BiddingClosed);
        emit BiddingClosed(tenderId, block.timestamp);
    }

    // Allot Winner
    function allotWinner(uint256 tenderId, address winner)
        external
        onlyGovernment
        validTender(tenderId)
    {
        require(
            tenders[tenderId].status == TenderStatus.BiddingClosed,
            "Bidding must be closed first"
        );
        require(winner != address(0), "Invalid winner address");

        TenderStatus oldStatus = tenders[tenderId].status;
        
        tenders[tenderId].status = TenderStatus.Allotted;
        tenders[tenderId].winner = winner;

        emit TenderStatusChanged(tenderId, oldStatus, TenderStatus.Allotted);
        emit WinnerAllotted(tenderId, winner, block.timestamp);
    }

    // Update Tender Status
    function updateTenderStatus(uint256 tenderId, TenderStatus newStatus)
        external
        onlyGovernment
        validTender(tenderId)
    {
        TenderStatus oldStatus = tenders[tenderId].status;
        
        tenders[tenderId].status = newStatus;

        emit TenderStatusChanged(tenderId, oldStatus, newStatus);
    }

    // Emergency Pause
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // View Functions
    function getTender(uint256 tenderId)
        external
        view
        validTender(tenderId)
        returns (
            string memory title,
            string memory category,
            uint256 budget,
            uint256 deadline,
            string memory ipfsDocHash,
            TenderStatus status,
            address winner,
            uint256 createdAt,
            uint256 biddingClosedAt
        )
    {
        Tender storage tender = tenders[tenderId];
        return (
            tender.title,
            tender.category,
            tender.budget,
            tender.deadline,
            tender.ipfsDocHash,
            tender.status,
            tender.winner,
            tender.createdAt,
            tender.biddingClosedAt
        );
    }

    function getMilestones(uint256 tenderId)
        external
        view
        validTender(tenderId)
        returns (Milestone[] memory)
    {
        return tenderMilestones[tenderId];
    }

    function getTenderCount() external view returns (uint256) {
        return _tenderCounter;
    }

    function isGovernmentAuthority(address authority) 
        external 
        view 
        returns (bool) 
    {
        return governmentAuthorities[authority];
    }
}
