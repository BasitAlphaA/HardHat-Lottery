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

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle unit Tests", function () {
      let raffle, vrfCoordinatorV2Mock, deployer, raffleEntranceFee, interval;
      const chainId = network.config.chainId;
      let accounts;

      beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        accounts = await ethers.getSigners();

        await deployments.fixture(["all"]);
        const raffleDeployment = await deployments.get("Raffle");
        const vrfCoordinatorV2MockDeployment = await deployments.get("VRFCoordinatorV2Mock");
        const signer = await ethers.getSigner(deployer);
        raffle = await ethers.getContractAt("Raffle", raffleDeployment.address, signer);
        vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfCoordinatorV2MockDeployment.address, signer);
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
         // Ensure the raffle contract is added as a consumer
         await vrfCoordinatorV2Mock.addConsumer(raffle.getsubscriptionId(), raffle.address);
      });

      describe("constructor", function () {
        it("initializes the raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState();
          const callbackGasLimit = await raffle.getcallbackGasLimit();
          const entranceFee = await raffle.getEntranceFee();
          assert.equal(raffleState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
          assert.equal(callbackGasLimit.toString(), networkConfig[chainId]["callbackGasLimit"]);
          assert.equal(entranceFee.toString(), networkConfig[chainId]["entranceFee"]);
        });
      });

      describe("enterRaffle", function () {
        it("reverts when you don't pay enough", async function () {
          await expect(raffle.enterRaffle()).to.be.rejectedWith("Raffle__NotEnoughETHEntered");
        });

        it("records player when they enter", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });

        it("emits event on enter", async function () {
          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter");
        });

        it("doesn't allow entrance when raffle is calculating", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await raffle.performUpkeep([]);
          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__RaffleNotOpen");
        });
      });

      describe("checkUpKeep", function () {
        it("returns false if people haven't sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(!upkeepNeeded);
        });

        it("returns false if not open", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep([]);
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });

        it("returns false if enough time hasn't passed", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });

        it("returns true if enough time has passed, has players, eth, and is open", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
          assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkUpkeep is true", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep([]);
          assert(tx);
        });

        it("reverts when checkUpkeep is false", async function () {
          await expect(raffle.performUpkeep([])).to.be.rejectedWith("Raffle__UpkeepNotNeeded");
        });

        it("updates the raffle state, emits an event & calls the vrf coordinator", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.send("evm_mine", []);
          const txResponse = await raffle.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "1");
          assert(requestId.toNumber() > 0);
        });
      });

      describe("fullfillRandomWords", function () {
        beforeEach(async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.send("evm_mine", []);
        });

        it("can only be called after performUpKeep", async function () {
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.rejectedWith("nonexistent request");
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.rejectedWith("nonexistent request");
        });

        it("picks a winner, resets, and sends money", async function () {
          const additionalEntrants = 3;
          const startingAccountIndex = 1; // deployer = 0
          for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
            const accountConnectedRaffle = raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
          }
          const startingTimeStamp = await raffle.getLatestTimeStamp();
          let  winnerStartingBalance

          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("Found the event!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const numOfPlayers = await raffle.getNumOfPlayers();
                const endingTimeStamp = await raffle.getLatestTimeStamp();
                const winnerEndingBalance = await accounts[1].getBalance();

                assert.equal(numOfPlayers.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert(endingTimeStamp > startingTimeStamp);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance
                    .add(raffleEntranceFee.mul(additionalEntrants).add(raffleEntranceFee))
                    .toString()
                );

                resolve();
              } catch (e) {
                reject(e);
              }
            });
                                         
            try {
              const tx = await raffle.performUpkeep([]);
              const txReceipt = await tx.wait(1);
               winnerStartingBalance = await accounts[1].getBalance();
              await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address);
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });
