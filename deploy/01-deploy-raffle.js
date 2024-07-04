const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subscriptionId , vrfCoordinatorV2Mock;

    if (developmentChains.includes(network.name)) {
        // Get the deployment of VRFCoordinatorV2Mock
        const vrfCoordinatorV2MockDeployment = await get("VRFCoordinatorV2Mock");

        // Get the signer object for the deployer
        const signer = await ethers.getSigner(deployer);

        // Get the contract instance using ethers with the correct signer
        vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfCoordinatorV2MockDeployment.address, signer);
        
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait();
        subscriptionId = transactionReceipt.events[0].args.subId.toString();
        
        // Fund the subscription
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }
  
//    await  vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const interval = networkConfig[chainId]["interval"];

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        interval,
        entranceFee,
        callbackGasLimit,

    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
        })
        log(`Raffle deployed at ${raffle.address}`);


        // USE MEEEEEEEEEEEEE!!!
        // Add the consumer after deploying the raffle contract
        if (developmentChains.includes(network.name)) {
            log(`Adding raffle contract as consumer to VRFCoordinatorV2Mock with subscription ID ${subscriptionId}`);
            await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
            log(`Consumer added successfully`);
        }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("verifying.....");
        await verify(raffle.address, args);
    }
    // await  vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)

    log("__________________________");
};

module.exports.tags = ["all", "raffle"];
