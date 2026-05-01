// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ScoringOracle is ReentrancyGuard, Ownable {
    struct ScoreRecord {
        uint256 tenderId;
        address contractor;
        uint256 score;
        bytes32 zkpProof;
        bool verified;
        uint256 timestamp;
    }

    uint256 private _scoreCounter;
    mapping(uint256 => ScoreRecord) public scores;
    mapping(uint256 => uint256[]) public tenderScores;
    mapping(address => uint256[]) public contractorScores;
    mapping(uint256 => address) public tenderWinners;

    event ScoreRecorded(uint256 indexed scoreId, uint256 indexed tenderId, address indexed contractor, uint256 score);
    event ZKPVerified(uint256 indexed scoreId, bool verified);
    event WinnerSelected(uint256 indexed tenderId, address indexed winner);

    modifier validScore(uint256 scoreId) {
        require(scoreId > 0 && scoreId <= _scoreCounter, "Invalid score ID");
        _;
    }

    constructor() Ownable(msg.sender) {
    }

    function recordScore(
        uint256 tenderId,
        address contractor,
        uint256 score,
        bytes32 zkpProof
    ) external onlyOwner nonReentrant returns (uint256) {
        require(score <= 100, "Score must be <= 100");
        require(zkpProof != bytes32(0), "ZKP proof required");

        _scoreCounter++;
        uint256 scoreId = _scoreCounter;

        scores[scoreId] = ScoreRecord({
            tenderId: tenderId,
            contractor: contractor,
            score: score,
            zkpProof: zkpProof,
            verified: true,
            timestamp: block.timestamp
        });

        tenderScores[tenderId].push(scoreId);
        contractorScores[contractor].push(scoreId);

        emit ScoreRecorded(scoreId, tenderId, contractor, score);
        emit ZKPVerified(scoreId, true);
        return scoreId;
    }

    function selectWinner(uint256 tenderId, address winner) external onlyOwner {
        require(tenderWinners[tenderId] == address(0), "Winner already selected");
        tenderWinners[tenderId] = winner;
        emit WinnerSelected(tenderId, winner);
    }

    function getScore(uint256 scoreId) external view validScore(scoreId) returns (ScoreRecord memory) {
        return scores[scoreId];
    }

    function getTenderScores(uint256 tenderId) external view returns (uint256[] memory) {
        return tenderScores[tenderId];
    }

    function getContractorScores(address contractor) external view returns (uint256[] memory) {
        return contractorScores[contractor];
    }

    function getScoreCount() external view returns (uint256) {
        return _scoreCounter;
    }
}
