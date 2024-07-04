import hardhat from "hardhat";
const { ethers, deployments, getNamedAccounts, network } = hardhat;
console.log("Importing from path:", "../../helper-hardhat-config.js");

import { developmentChains, networkConfig } from "../../helper-hardhat-config.js";
import { expect, assert } from "chai";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { solidity } from "ethereum-waffle";

chai.use(chaiAsPromised);
chai.use(solidity);


developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
            const namedAccounts = await getNamedAccounts();
            deployer = namedAccounts.deployer;
            //   deployer = (await getNamedAccounts()).deployer
            //   raffle = await ethers.getContract("Raffle", deployer)
            const raffleDeployment = await deployments.get("Raffle");
            const signer = await ethers.getSigner(deployer);
            raffle = await ethers.getContractAt("Raffle", raffleDeployment.address, signer);
              raffleEntranceFee = await raffle.getEntranceFee()
            
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()

                      // and this code WONT complete until our listener has finished listening!
                     
                });
                  })
              })
          })
     
