// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BountyHunter is ReentrancyGuard, Ownable {
    struct Assignment {
        uint256 submissionId;
        address[] hunters;
        uint256 commitDeadline;
        mapping(address => bytes32) commits;
        mapping(address => bool) revealed;
        uint256[] ratings;
        bool completed;
    }

    struct Hunter {
        address addr;
        uint256 stake;
        uint256 completedReviews;
        uint256 reputation;
        bool registered;
    }

    uint256 private _assignmentCounter;
    mapping(uint256 => Assignment) public assignments;
    mapping(address => Hunter) public hunters;
    mapping(address => uint256[]) public hunterAssignments;
    IERC20 public stakingToken;
    uint256 public constant HUNTER_STAKE_AMOUNT = 100 * 10**18; // 100 tokens
    uint256 public constant COMMIT_WINDOW_HOURS = 24;

    event HunterRegistered(address indexed hunter, uint256 stake);
    event HuntersAssigned(uint256 indexed assignmentId, address[] hunters);
    event ReviewCommitted(uint256 indexed assignmentId, address indexed hunter, bytes32 commitHash);
    event ReviewRevealed(uint256 indexed assignmentId, address indexed hunter, uint8 rating);
    event AssignmentCompleted(uint256 indexed assignmentId);

    modifier onlyRegisteredHunter() {
        require(hunters[msg.sender].registered, "Not a registered hunter");
        _;
    }

    modifier validAssignment(uint256 assignmentId) {
        require(assignmentId > 0 && assignmentId <= _assignmentCounter, "Invalid assignment ID");
        _;
    }

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
    }

    function registerHunter() external nonReentrant {
        require(!hunters[msg.sender].registered, "Already registered");
        require(stakingToken.transferFrom(msg.sender, address(this), HUNTER_STAKE_AMOUNT), "Stake transfer failed");

        hunters[msg.sender] = Hunter({
            addr: msg.sender,
            stake: HUNTER_STAKE_AMOUNT,
            completedReviews: 0,
            reputation: 50,
            registered: true
        });

        emit HunterRegistered(msg.sender, HUNTER_STAKE_AMOUNT);
    }

    function assignHunters(uint256 submissionId, address[] calldata selectedHunters) external onlyOwner nonReentrant {
        require(selectedHunters.length >= 2, "Need at least 2 hunters");

        _assignmentCounter++;
        uint256 assignmentId = _assignmentCounter;

        Assignment storage assignment = assignments[assignmentId];
        assignment.submissionId = submissionId;
        assignment.hunters = selectedHunters;
        assignment.commitDeadline = block.timestamp + (COMMIT_WINDOW_HOURS * 1 hours);
        assignment.completed = false;

        for (uint256 i = 0; i < selectedHunters.length; i++) {
            hunterAssignments[selectedHunters[i]].push(assignmentId);
        }

        emit HuntersAssigned(assignmentId, selectedHunters);
    }

    function commitReview(uint256 assignmentId, bytes32 commitHash) external onlyRegisteredHunter validAssignment(assignmentId) nonReentrant {
        Assignment storage assignment = assignments[assignmentId];
        require(block.timestamp <= assignment.commitDeadline, "Commit deadline passed");
        require(assignment.commits[msg.sender] == bytes32(0), "Already committed");

        assignment.commits[msg.sender] = commitHash;
        emit ReviewCommitted(assignmentId, msg.sender, commitHash);
    }

    function revealReview(uint256 assignmentId, uint8 rating, bytes32 salt) external onlyRegisteredHunter validAssignment(assignmentId) nonReentrant {
        Assignment storage assignment = assignments[assignmentId];
        require(assignment.commits[msg.sender] != bytes32(0), "Not committed");
        require(!assignment.revealed[msg.sender], "Already revealed");

        bytes32 computedHash = keccak256(abi.encodePacked(rating, salt));
        require(computedHash == assignment.commits[msg.sender], "Invalid reveal");

        assignment.revealed[msg.sender] = true;
        assignment.ratings.push(rating);
        hunters[msg.sender].completedReviews++;

        emit ReviewRevealed(assignmentId, msg.sender, rating);

        if (assignment.ratings.length >= 2) {
            assignment.completed = true;
            emit AssignmentCompleted(assignmentId);
        }
    }

    function getHunter(address hunterAddr) external view returns (Hunter memory) {
        return hunters[hunterAddr];
    }

    function getAssignment(uint256 assignmentId) external view validAssignment(assignmentId) returns (
        uint256 submissionId,
        uint256 commitDeadline,
        bool completed,
        uint256 ratingsCount
    ) {
        Assignment storage assignment = assignments[assignmentId];
        return (
            assignment.submissionId,
            assignment.commitDeadline,
            assignment.completed,
            assignment.ratings.length
        );
    }

    function getHunterAssignments(address hunter) external view returns (uint256[] memory) {
        return hunterAssignments[hunter];
    }

    function getAssignmentCount() external view returns (uint256) {
        return _assignmentCounter;
    }
}
