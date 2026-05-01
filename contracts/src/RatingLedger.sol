// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RatingLedger is ReentrancyGuard, Ownable {
    struct Rating {
        uint256 tenderId;
        uint8 score;
        uint256 timestamp;
        string review;
    }

    struct ContractorProfile {
        uint256 totalRating;
        uint256 ratingCount;
        uint256 completedProjects;
        uint256 onTimeCompletionRate;
        bool frozen;
        uint256 frozenAt;
    }

    mapping(address => ContractorProfile) public profiles;
    mapping(address => Rating[]) public ratingHistory;
    mapping(address => bool) public verifiedContractors;

    event RatingUpdated(address indexed contractor, uint8 score, uint256 newAverage);
    event ContractorFrozen(address indexed contractor, uint256 frozenAt);
    event ContractorVerified(address indexed contractor);

    modifier notFrozen(address contractor) {
        require(!profiles[contractor].frozen, "Contractor is frozen");
        _;
    }

    constructor() Ownable(msg.sender) {
    }

    function updateRating(address contractor, uint8 score, uint256 tenderId, string calldata review) external onlyOwner nonReentrant notFrozen(contractor) {
        require(score >= 0 && score <= 100, "Invalid score");
        require(verifiedContractors[contractor], "Contractor not verified");

        ContractorProfile storage profile = profiles[contractor];
        profile.totalRating += score;
        profile.ratingCount++;
        profile.completedProjects++;

        ratingHistory[contractor].push(Rating({
            tenderId: tenderId,
            score: score,
            timestamp: block.timestamp,
            review: review
        }));

        uint256 newAverage = profile.totalRating / profile.ratingCount;
        emit RatingUpdated(contractor, score, newAverage);
    }

    function freezeContractor(address contractor) external onlyOwner {
        require(!profiles[contractor].frozen, "Already frozen");
        profiles[contractor].frozen = true;
        profiles[contractor].frozenAt = block.timestamp;
        emit ContractorFrozen(contractor, block.timestamp);
    }

    function unfreezeContractor(address contractor) external onlyOwner {
        require(profiles[contractor].frozen, "Not frozen");
        profiles[contractor].frozen = false;
        profiles[contractor].frozenAt = 0;
    }

    function verifyContractor(address contractor) external onlyOwner {
        require(!verifiedContractors[contractor], "Already verified");
        verifiedContractors[contractor] = true;
        emit ContractorVerified(contractor);
    }

    function getRating(address contractor) external view returns (uint256 average, uint256 count, uint256 completed) {
        ContractorProfile memory profile = profiles[contractor];
        uint256 avg = profile.ratingCount > 0 ? profile.totalRating / profile.ratingCount : 60;
        return (avg, profile.ratingCount, profile.completedProjects);
    }

    function getRatingHistory(address contractor) external view returns (Rating[] memory) {
        return ratingHistory[contractor];
    }

    function isVerified(address contractor) external view returns (bool) {
        return verifiedContractors[contractor];
    }
}
