// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VRFCoordinatorV2Interface} from "chainlink-brownie-contracts/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/// @title MockVRFCoordinatorV2 — Test mock for Chainlink VRF V2
/// @dev Allows tests to manually trigger fulfillment with controlled random words.
contract MockVRFCoordinatorV2 {
    uint256 private _requestId;
    address private _lastCaller;
    uint256 private _lastRequestId;

    struct Request {
        address caller;
        uint32 numWords;
    }

    mapping(uint256 => Request) public requests;

    function requestRandomWords(
        bytes32, // keyHash
        uint64,  // subId
        uint16,  // minimumRequestConfirmations
        uint32,  // callbackGasLimit
        uint32 numWords
    ) external returns (uint256) {
        _requestId++;
        requests[_requestId] = Request({
            caller: msg.sender,
            numWords: numWords
        });
        _lastCaller = msg.sender;
        _lastRequestId = _requestId;
        return _requestId;
    }

    /// @dev Manually fulfill a VRF request with the given random words
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        Request memory req = requests[requestId];
        require(req.caller != address(0), "Request not found");

        // Call rawFulfillRandomWords on the consumer contract
        (bool success,) = req.caller.call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords)
        );
        require(success, "VRF fulfillment failed");

        delete requests[requestId];
    }

    /// @dev Convenience: fulfill the last request with a single random word
    function fulfillLastRequest(uint256 randomWord) external {
        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;
        this.fulfillRandomWords(_lastRequestId, words);
    }

    function getLastRequestId() external view returns (uint256) {
        return _lastRequestId;
    }
}
