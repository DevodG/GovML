// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MilestoneEscrow is ReentrancyGuard, Ownable {
    struct MilestoneSubmission {
        uint256 tenderId;
        uint256 milestoneIndex;
        string ipfsHash;
        string gpsHash;
        uint256 submittedAt;
        uint256 proofWindow;
        uint256 amount;
        bool completed;
        uint256 sigCount;
        mapping(address => bool) signatures;
    }

    uint256 private _submissionCounter;
    mapping(uint256 => MilestoneSubmission) public submissions;
    mapping(uint256 => uint256[]) public tenderSubmissions;
    mapping(address => uint256[]) public contractorSubmissions;
    IERC20 public paymentToken;
    uint256 public constant PROOF_WINDOW_DAYS = 7;
    uint256 public constant SIGNATURES_REQUIRED = 3;

    event MilestoneSubmitted(uint256 indexed submissionId, uint256 indexed tenderId, uint256 milestoneIndex, string ipfsHash);
    event MilestoneSigned(uint256 indexed submissionId, address indexed signer);
    event FundsReleased(uint256 indexed submissionId, address indexed contractor, uint256 amount);
    event FundsRedistributed(uint256 indexed submissionId, uint256 amount);

    modifier validSubmission(uint256 submissionId) {
        require(submissionId > 0 && submissionId <= _submissionCounter, "Invalid submission ID");
        _;
    }

    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
    }

    function submitMilestone(
        uint256 tenderId,
        uint256 milestoneIndex,
        string calldata ipfsHash,
        string calldata gpsHash,
        uint256 amount
    ) external nonReentrant returns (uint256) {
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(amount > 0, "Amount required");

        _submissionCounter++;
        uint256 submissionId = _submissionCounter;

        MilestoneSubmission storage submission = submissions[submissionId];
        submission.tenderId = tenderId;
        submission.milestoneIndex = milestoneIndex;
        submission.ipfsHash = ipfsHash;
        submission.gpsHash = gpsHash;
        submission.submittedAt = block.timestamp;
        submission.proofWindow = block.timestamp + (PROOF_WINDOW_DAYS * 1 days);
        submission.amount = amount;
        submission.completed = false;
        submission.sigCount = 0;

        tenderSubmissions[tenderId].push(submissionId);
        contractorSubmissions[msg.sender].push(submissionId);

        emit MilestoneSubmitted(submissionId, tenderId, milestoneIndex, ipfsHash);
        return submissionId;
    }

    function signMilestone(uint256 submissionId) external validSubmission(submissionId) nonReentrant {
        MilestoneSubmission storage submission = submissions[submissionId];
        require(!submission.signatures[msg.sender], "Already signed");
        require(!submission.completed, "Already completed");

        submission.signatures[msg.sender] = true;
        submission.sigCount++;

        emit MilestoneSigned(submissionId, msg.sender);

        if (submission.sigCount >= SIGNATURES_REQUIRED) {
            submission.completed = true;
            require(paymentToken.transfer(msg.sender, submission.amount), "Transfer failed");
            emit FundsReleased(submissionId, msg.sender, submission.amount);
        }
    }

    function deadManTrigger(uint256 submissionId) external validSubmission(submissionId) nonReentrant {
        MilestoneSubmission storage submission = submissions[submissionId];
        require(block.timestamp > submission.proofWindow, "Proof window still open");
        require(submission.sigCount < SIGNATURES_REQUIRED, "Already approved");
        require(!submission.completed, "Already completed");

        submission.completed = true;
        emit FundsRedistributed(submissionId, submission.amount);
    }

    function getSubmission(uint256 submissionId) external view validSubmission(submissionId) returns (
        uint256 tenderId,
        uint256 milestoneIndex,
        string memory ipfsHash,
        string memory gpsHash,
        uint256 submittedAt,
        uint256 proofWindow,
        uint256 amount,
        bool completed,
        uint256 sigCount
    ) {
        MilestoneSubmission storage submission = submissions[submissionId];
        return (
            submission.tenderId,
            submission.milestoneIndex,
            submission.ipfsHash,
            submission.gpsHash,
            submission.submittedAt,
            submission.proofWindow,
            submission.amount,
            submission.completed,
            submission.sigCount
        );
    }

    function getTenderSubmissions(uint256 tenderId) external view returns (uint256[] memory) {
        return tenderSubmissions[tenderId];
    }

    function getSubmissionCount() external view returns (uint256) {
        return _submissionCounter;
    }
}
