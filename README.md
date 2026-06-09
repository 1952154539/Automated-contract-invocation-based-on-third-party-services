# Bank 合约 + Chainlink Automation 自动化任务

基于 Chainlink Automation 实现合约自动化调用：当 Bank 合约存款超过阈值时，自动将一半存款转给指定地址。

## 合约功能

- **deposit()** — 用户存入 ETH
- **checkUpkeep()** — Chainlink Automation 检查是否需要执行（余额 > 阈值）
- **performUpkeep()** — 执行自动化转账（转一半给 recipient）
- **setThreshold() / setRecipient()** — Owner 管理参数

## 快速开始

```bash
npm install
npx hardhat compile
npx hardhat test
```

## 部署

1. 复制 `.env.example` 为 `.env`，填入私钥和 Infura API Key
2. 执行部署：

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## 在 Chainlink Automation 上注册

1. 打开 https://automation.chain.link/
2. 点击 **Register new Upkeep**
3. 选择 **Custom Logic** 作为触发类型
4. 输入部署后的 Bank 合约地址
5. 配置 Upkeep 参数（Gas limit 建议 300,000）
6. 存入 LINK 代币作为自动化执行费用
7. 激活 Upkeep

## 工作流程

```
用户 deposit() → 合约余额增加
     ↓
Chainlink Automation 定时调用 checkUpkeep()
     ↓
余额 > threshold ?
     ↓ YES
Chainlink 调用 performUpkeep()
     ↓
转移一半 ETH 到 recipient
     ↓
余额降低，等待下次触发
```

## 测试覆盖

21 个测试用例，覆盖：部署、存款、checkUpkeep、performUpkeep、权限管理
