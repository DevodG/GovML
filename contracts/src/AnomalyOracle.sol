// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AnomalyOracle is ReentrancyGuard, Ownable {
    struct AnomalyFlag {
        uint256 entityId;
        string entityType;
        string anomalyType;
        uint256 severity;
        string description;
        uint256 timestamp;
        bool active;
        bool reviewed;
        address reviewedBy;
        uint256 reviewedAt;
    }

    uint256 private _flagCounter;
    mapping(uint256 => AnomalyFlag) public flags;
    mapping(string => uint256[]) public entityFlags;
    mapping(address => uint256[]) public reviewerFlags;

    event AnomalyFlagged(uint256 indexed flagId, string indexed entityType, uint256 indexed entityId, string anomalyType, uint256 severity);
    event AnomalyReviewed(uint256 indexed flagId, address indexed reviewer, bool approved);
    event FundsFrozen(uint256 indexed entityId, string reason);

    modifier validFlag(uint256 flagId) {
        require(flagId > 0 && flagId <= _flagCounter, "Invalid flag ID");
        _;
    }

    constructor() Ownable(msg.sender) {
    }

    function flagAnomaly(
        uint256 entityId,
        string calldata entityType,
        string calldata anomalyType,
        uint256 severity,
        string calldata description
    ) external onlyOwner nonReentrant returns (uint256) {
        require(severity >= 1 && severity <= 10, "Severity must be 1-10");
        require(bytes(anomalyType).length > 0, "Anomaly type required");

        _flagCounter++;
        uint256 flagId = _flagCounter;

        flags[flagId] = AnomalyFlag({
            entityId: entityId,
            entityType: entityType,
            anomalyType: anomalyType,
            severity: severity,
            description: description,
            timestamp: block.timestamp,
            active: true,
            reviewed: false,
            reviewedBy: address(0),
            reviewedAt: 0
        });

        entityFlags[entityType].push(flagId);

        if (severity >= 7) {
            emit FundsFrozen(entityId, description);
        }

        emit AnomalyFlagged(flagId, entityType, entityId, anomalyType, severity);
        return flagId;
    }

    function reviewFlag(uint256 flagId, bool approved) external onlyOwner validFlag(flagId) nonReentrant {
        require(!flags[flagId].reviewed, "Already reviewed");

        flags[flagId].reviewed = true;
        flags[flagId].reviewedBy = msg.sender;
        flags[flagId].reviewedAt = block.timestamp;

        if (!approved) {
            flags[flagId].active = false;
        }

        reviewerFlags[msg.sender].push(flagId);
        emit AnomalyReviewed(flagId, msg.sender, approved);
    }

    function getFlag(uint256 flagId) external view validFlag(flagId) returns (AnomalyFlag memory) {
        return flags[flagId];
    }

    function getEntityFlags(string calldata entityType) external view returns (uint256[] memory) {
        return entityFlags[entityType];
    }

    function getReviewerFlags(address reviewer) external view returns (uint256[] memory) {
        return reviewerFlags[reviewer];
    }

    function getFlagCount() external view returns (uint256) {
        return _flagCounter;
    }

    function getActiveFlags() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= _flagCounter; i++) {
            if (flags[i].active && !flags[i].reviewed) {
                activeCount++;
            }
        }

        uint256[] memory activeFlags = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= _flagCounter; i++) {
            if (flags[i].active && !flags[i].reviewed) {
                activeFlags[index] = i;
                index++;
            }
        }

        return activeFlags;
    }
}
