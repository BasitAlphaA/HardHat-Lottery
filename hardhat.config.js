require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_API_KEY =
  process.env.ETHERSCAN_API_KEY || "49W4CR3YSTZ17FBXHG375VAKS2CTKDQQVZ"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
    networks: {
        hardhat: {
      
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
        sepolia: {
          url: SEPOLIA_RPC_URL,
          accounts: [PRIVATE_KEY],
            blockConfirmations: 1,
            chainId: 11155111,
        }
      },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
      }, 
      {
        version: "0.8.7",
      },
      {
        version: "0.8.20",
      },
      {
        version: "0.8.14",
      },
      {
        version: "0.4.23",
      },
      {
        version: "0.8.0",
      }
    
    ]
},
gasReporter: {
  enabled: true,
  currency: "USD",
  outputFile: "gas-report.txt",
  noColors: true,
  // coinmarketcap: COINMARKETCAP_API_KEY,
  token: "MATIC",
},

namedAccounts: {
  deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
  },
  player: {
      default: 1,
  },
},
mocha:{
  timeout: 600000,
},
etherscan: {
  // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
  apiKey: {
      sepolia: ETHERSCAN_API_KEY,
   
  }
}
}
