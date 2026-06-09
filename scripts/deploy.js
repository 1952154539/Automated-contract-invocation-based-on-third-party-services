const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 配置参数：recipient 和 threshold（单位 wei）
  // threshold = 0.01 ETH = 10^16 wei
  const RECIPIENT = deployer.address; // 可修改为其他地址
  const THRESHOLD = hre.ethers.parseEther("0.01");

  const Bank = await hre.ethers.getContractFactory("Bank");
  const bank = await Bank.deploy(RECIPIENT, THRESHOLD);

  await bank.waitForDeployment();

  const address = await bank.getAddress();
  console.log("Bank deployed to:", address);
  console.log("Recipient:", RECIPIENT);
  console.log("Threshold:", hre.ethers.formatEther(THRESHOLD), "ETH");

  // 输出 Chainlink Automation 注册信息
  console.log("\n=== Chainlink Automation 注册指南 ===");
  console.log("1. 打开 https://automation.chain.link/");
  console.log("2. 点击 'Register new Upkeep'");
  console.log("3. 选择 'Custom Logic'");
  console.log("4. 输入合约地址:", address);
  console.log("5. 配置 Upkeep 参数");
  console.log("6. 使用 LINK 代币支付 gas 费用，或用 ERC20 代币支付");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
