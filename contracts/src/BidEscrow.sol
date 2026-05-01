// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BidEscrow is ReentrancyGuard, Ownable {
    struct Bid {
        address contractor;
        uint256 tenderId;
        uint256 amount;
        uint256 timestamp;
        bool active;
        bool refunded;
    }

    uint256 private _bidCounter;
    mapping(uint256 => Bid) public bids;
    mapping(uint256 => uint256[]) public tenderBids;
    mapping(address => uint256[]) public contractorBids;
    mapping(uint256 => address) public tenderWinners;
    IERC20 public stakingToken;

    event BidSubmitted(uint256 indexed bidId, uint256 indexed tenderId, address indexed contractor, uint256 amount);
    event BidRefunded(uint256 indexed bidId, address indexed contractor, uint256 amount);
    event WinnerStakeLocked(uint256 indexed tenderId, address indexed winner, uint256 amount);
    event LosersRefunded(uint256 indexed tenderId, uint256 totalRefunded);

    modifier validBid(uint256 bidId) {
        require(bidId > 0 && bidId <= _bidCounter, "Invalid bid ID");
        _;
    }

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
    }

    function submitBid(uint256 tenderId, uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        _bidCounter++;
        uint256 bidId = _bidCounter;

        bids[bidId] = Bid({
            contractor: msg.sender,
            tenderId: tenderId,
            amount: amount,
            timestamp: block.timestamp,
            active: true,
            refunded: false
        });

        tenderBids[tenderId].push(bidId);
        contractorBids[msg.sender].push(bidId);

        emit BidSubmitted(bidId, tenderId, msg.sender, amount);
        return bidId;
    }

    function withdrawBid(uint256 bidId) external validBid(bidId) nonReentrant {
        require(bids[bidId].contractor == msg.sender, "Not your bid");
        require(bids[bidId].active, "Bid not active");
        require(!bids[bidId].refunded, "Already refunded");

        bids[bidId].active = false;
        bids[bidId].refunded = true;

        require(stakingToken.transfer(msg.sender, bids[bidId].amount), "Refund failed");
        emit BidRefunded(bidId, msg.sender, bids[bidId].amount);
    }

    function lockWinnerStake(uint256 tenderId, address winner) external onlyOwner {
        require(tenderWinners[tenderId] == address(0), "Winner already set");
        tenderWinners[tenderId] = winner;
        emit WinnerStakeLocked(tenderId, winner, 0);
    }

    function refundLosers(uint256 tenderId) external onlyOwner nonReentrant {
        uint256[] memory bidIds = tenderBids[tenderId];
        uint256 totalRefunded = 0;

        for (uint256 i = 0; i < bidIds.length; i++) {
            Bid storage bid = bids[bidIds[i]];
            if (bid.active && !bid.refunded && bid.contractor != tenderWinners[tenderId]) {
                bid.active = false;
                bid.refunded = true;
                require(stakingToken.transfer(bid.contractor, bid.amount), "Refund failed");
                totalRefunded += bid.amount;
                emit BidRefunded(bidIds[i], bid.contractor, bid.amount);
            }
        }

        emit LosersRefunded(tenderId, totalRefunded);
    }

    function getBid(uint256 bidId) external view validBid(bidId) returns (Bid memory) {
        return bids[bidId];
    }

    function getTenderBids(uint256 tenderId) external view returns (uint256[] memory) {
        return tenderBids[tenderId];
    }

    function getContractorBids(address contractor) external view returns (uint256[] memory) {
        return contractorBids[contractor];
    }

    function getBidCount() external view returns (uint256) {
        return _bidCounter;
    }
}
