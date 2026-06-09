// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Bank
 * @notice 用户存款合约，集成 Chainlink Automation 实现自动化转账
 *         当合约余额超过 threshold 时，自动将一半存款转给 recipient
 */
contract Bank {
    address public owner;
    address public recipient;
    uint256 public threshold;

    mapping(address => uint256) public deposits;

    event Deposited(address indexed user, uint256 amount);
    event HalfTransferred(address indexed to, uint256 amount);
    event ThresholdUpdated(uint256 newThreshold);
    event RecipientUpdated(address newRecipient);

    constructor(address _recipient, uint256 _threshold) {
        require(_recipient != address(0), "Invalid recipient");
        owner = msg.sender;
        recipient = _recipient;
        threshold = _threshold;
    }

    /// @notice 用户存款
    function deposit() external payable {
        require(msg.value > 0, "Must deposit > 0");
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Chainlink Automation: 检查是否需要执行 upkeep
    /// @return upkeepNeeded 是否需要执行
    /// @return performData 传给 performUpkeep 的数据
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 balance = address(this).balance;
        upkeepNeeded = balance > threshold;
        if (upkeepNeeded) {
            uint256 half = balance / 2;
            performData = abi.encode(recipient, half);
        }
    }

    /// @notice Chainlink Automation: 执行自动化任务，转移一半存款给 recipient
    function performUpkeep(bytes calldata performData) external {
        (address to, uint256 expectedAmount) = abi.decode(performData, (address, uint256));

        uint256 balance = address(this).balance;
        require(balance > threshold, "Balance not above threshold");
        require(expectedAmount == balance / 2, "Amount stale");
        require(to == recipient, "Recipient changed");

        uint256 half = balance / 2;
        (bool success,) = to.call{value: half}("");
        require(success, "Transfer failed");

        emit HalfTransferred(to, half);
    }

    /// @notice Owner 设置新的阈值
    function setThreshold(uint256 _threshold) external {
        require(msg.sender == owner, "Not owner");
        threshold = _threshold;
        emit ThresholdUpdated(_threshold);
    }

    /// @notice Owner 设置新的接收地址
    function setRecipient(address _recipient) external {
        require(msg.sender == owner, "Not owner");
        require(_recipient != address(0), "Zero address");
        recipient = _recipient;
        emit RecipientUpdated(_recipient);
    }

    /// @notice 查询合约余额
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
