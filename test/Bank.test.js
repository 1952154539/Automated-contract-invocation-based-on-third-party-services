const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bank", function () {
  let Bank, bank, owner, recipient, user1, user2;

  const THRESHOLD = ethers.parseEther("1.0"); // 1 ETH

  beforeEach(async function () {
    [owner, recipient, user1, user2] = await ethers.getSigners();
    Bank = await ethers.getContractFactory("Bank");
    bank = await Bank.deploy(recipient.address, THRESHOLD);
    await bank.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set owner correctly", async function () {
      expect(await bank.owner()).to.equal(owner.address);
    });

    it("should set recipient correctly", async function () {
      expect(await bank.recipient()).to.equal(recipient.address);
    });

    it("should set threshold correctly", async function () {
      expect(await bank.threshold()).to.equal(THRESHOLD);
    });

    it("should revert if recipient is zero address", async function () {
      const Bank = await ethers.getContractFactory("Bank");
      await expect(Bank.deploy(ethers.ZeroAddress, THRESHOLD)).to.be.revertedWith(
        "Invalid recipient"
      );
    });
  });

  describe("Deposit", function () {
    it("should accept deposits and track per-user balance", async function () {
      const amount = ethers.parseEther("0.5");
      await bank.connect(user1).deposit({ value: amount });
      expect(await bank.deposits(user1.address)).to.equal(amount);
    });

    it("should emit Deposited event", async function () {
      const amount = ethers.parseEther("0.5");
      await expect(bank.connect(user1).deposit({ value: amount }))
        .to.emit(bank, "Deposited")
        .withArgs(user1.address, amount);
    });

    it("should revert on zero deposit", async function () {
      await expect(bank.connect(user1).deposit({ value: 0 })).to.be.revertedWith(
        "Must deposit > 0"
      );
    });

    it("should accept ETH via receive", async function () {
      const amount = ethers.parseEther("0.3");
      await user1.sendTransaction({ to: await bank.getAddress(), value: amount });
      expect(await bank.deposits(user1.address)).to.equal(amount);
    });
  });

  describe("Chainlink Automation - checkUpkeep", function () {
    it("should return false when balance is below threshold", async function () {
      const [upkeepNeeded, performData] = await bank.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(false);
    });

    it("should return false when balance equals threshold", async function () {
      await bank.connect(user1).deposit({ value: THRESHOLD });
      const [upkeepNeeded, performData] = await bank.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(false);
    });

    it("should return true when balance exceeds threshold", async function () {
      await bank.connect(user1).deposit({ value: ethers.parseEther("1.5") });
      const [upkeepNeeded, performData] = await bank.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(true);

      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["address", "uint256"],
        performData
      );
      expect(decoded[0]).to.equal(recipient.address);
      expect(decoded[1]).to.equal(ethers.parseEther("0.75")); // half of 1.5
    });
  });

  describe("Chainlink Automation - performUpkeep", function () {
    it("should transfer half balance to recipient", async function () {
      const depositAmount = ethers.parseEther("2.0");
      await bank.connect(user1).deposit({ value: depositAmount });

      const [, performData] = await bank.checkUpkeep("0x");
      const recipientBefore = await ethers.provider.getBalance(recipient.address);

      await bank.performUpkeep(performData);

      // 合约余额应减半
      expect(await ethers.provider.getBalance(await bank.getAddress())).to.equal(
        ethers.parseEther("1.0")
      );
      // recipient 应收到了 1 ETH
      const recipientAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientAfter - recipientBefore).to.equal(ethers.parseEther("1.0"));
    });

    it("should emit HalfTransferred event", async function () {
      await bank.connect(user1).deposit({ value: ethers.parseEther("2.0") });
      const [, performData] = await bank.checkUpkeep("0x");

      await expect(bank.performUpkeep(performData))
        .to.emit(bank, "HalfTransferred")
        .withArgs(recipient.address, ethers.parseEther("1.0"));
    });

    it("should revert if balance is not above threshold", async function () {
      // 尝试用过期数据调用 performUpkeep
      const fakeData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [recipient.address, ethers.parseEther("0.5")]
      );
      await expect(bank.performUpkeep(fakeData)).to.be.revertedWith(
        "Balance not above threshold"
      );
    });

    it("should allow anyone to call performUpkeep when conditions met", async function () {
      await bank.connect(user1).deposit({ value: ethers.parseEther("2.0") });
      const [, performData] = await bank.checkUpkeep("0x");

      // user2 (not owner) calls performUpkeep
      await expect(bank.connect(user2).performUpkeep(performData))
        .to.emit(bank, "HalfTransferred");
    });

    it("should be idempotent - second call reverts after first succeeds", async function () {
      await bank.connect(user1).deposit({ value: ethers.parseEther("2.0") });
      const [, performData] = await bank.checkUpkeep("0x");

      // 第一次执行成功，余额变为 1 ETH
      await bank.performUpkeep(performData);

      // 第二次执行应失败，因为余额 = 阈值
      await expect(bank.performUpkeep(performData)).to.be.revertedWith(
        "Balance not above threshold"
      );
    });
  });

  describe("Admin functions", function () {
    it("should allow owner to set threshold", async function () {
      const newThreshold = ethers.parseEther("5.0");
      await bank.connect(owner).setThreshold(newThreshold);
      expect(await bank.threshold()).to.equal(newThreshold);
    });

    it("should emit ThresholdUpdated event", async function () {
      await expect(bank.connect(owner).setThreshold(ethers.parseEther("3.0")))
        .to.emit(bank, "ThresholdUpdated")
        .withArgs(ethers.parseEther("3.0"));
    });

    it("should prevent non-owner from setting threshold", async function () {
      await expect(
        bank.connect(user1).setThreshold(ethers.parseEther("5.0"))
      ).to.be.revertedWith("Not owner");
    });

    it("should allow owner to set recipient", async function () {
      await bank.connect(owner).setRecipient(user2.address);
      expect(await bank.recipient()).to.equal(user2.address);
    });

    it("should prevent non-owner from setting recipient", async function () {
      await expect(
        bank.connect(user1).setRecipient(user2.address)
      ).to.be.revertedWith("Not owner");
    });
  });
});
