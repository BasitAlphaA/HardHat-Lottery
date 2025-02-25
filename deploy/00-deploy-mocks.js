const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25")
const GAS_PRICE_LINK = 1e9 //1000000000

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    
 const args = [BASE_FEE, GAS_PRICE_LINK]
if( developmentChains.includes(network.name)){
    log("Local network detected! Deploying Mocks......")
    await deploy("VRFCoordinatorV2Mock", {
        from: deployer,
        log:true,
        args:args,
    })
    log("Mocks Deployed!")
    log("_________________________")
}

}

module.exports.tags = ["all","mocks"]