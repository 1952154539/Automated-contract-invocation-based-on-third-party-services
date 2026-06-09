# Bank 合约 + Chainlink Automation 自动化任务

基于 Chainlink Automation 实现合约自动化调用：当 Bank 合约存款超过阈值时，自动将一半存款转给指定地址。

## 在线链接

| 资源 | 链接 |
|------|------|
| **GitHub** | https://github.com/1952154539/Automated-contract-invocation-based-on-third-party-services |
| **Sepolia 合约** | https://sepolia.etherscan.io/address/0x8180f2f4e66260ceFeF68108CA875D0441666772 |
| **Chainlink Automation 执行** | https://automation.chain.link/sepolia/22170105936214894676454633608894277159891156406754630123772933687245926865198 |
| **注册交易** | https://sepolia.etherscan.io/tx/0x470782429a78949dcccd27656b16c49104815edb56fdf5c74185f009fcda6414 |

## 部署信息

- **网络**: Sepolia
- **合约地址**: `0x8180f2f4e66260ceFeF68108CA875D0441666772`
- **Threshold**: 0.01 ETH
- **Recipient/Owner**: `0xC7a263b1205226158b7A5F8Aa8fDbAAe9c15A55d`
- **Upkeep 名称**: Bank Auto Transfer
- **Upkeep ID**: `22170105936214894676454633608894277159891156406754630123772933687245926865198`

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

```bash
# 1. 配置 .env
cp .env.example .env
# 填入 PRIVATE_KEY 和 SEPOLIA_RPC_URL

# 2. 部署
npx hardhat run scripts/deploy.js --network sepolia
```

## Chainlink Automation 注册流程

1. 打开 https://automation.chain.link/
2. 点击 **Register new Upkeep** → **Custom Logic**
3. 输入合约地址，配置 Gas limit = 300,000
4. 存入 LINK 代币，激活 Upkeep

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
```

## 测试

21 个测试用例，覆盖：部署、存款、checkUpkeep、performUpkeep、权限管理
