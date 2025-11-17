import { Address, Asset, xdr } from "stellar-sdk";
import { config } from "./config/env.ts";
import { Api } from "stellar-sdk/rpc";
import { Settings } from "./utils/settings-types.ts";
import { readFromJsonFile } from "./utils/io.ts";
import { LocalSigner } from "@colibri/core";
import chalk from "chalk";

const { rpc, network, ioConfig } = config;

// Get the native XLM contract ID for testnet
const contractId = Asset.native().contractId(network);

const settings = await readFromJsonFile<Settings>(ioConfig.settings);

const gAccountSigner = LocalSigner.fromSecret(settings.gAccountSecretKey);
const mAccountSigner = LocalSigner.fromSecret(settings.mAccountSecretKey);
const smartWalletContractId = settings.smartWalletContractId;

// The address we want to monitor for incoming payments
const monitoredAddresses = [
  new Address(gAccountSigner.publicKey()),
  new Address(mAccountSigner.publicKey()),
  new Address(smartWalletContractId),
];

// Paging state for event polling (similar to useSubscription hook)
let lastLedgerStart: number | undefined;
let pagingToken: string | undefined;

const eventsChecked: string[] = [];

async function pollForTransfers() {
  // Set starting ledger if not set (get the latest ledger as starting point)
  if (!lastLedgerStart) {
    const latestLedger = await rpc.getLatestLedger();
    lastLedgerStart = latestLedger.sequence;
  }
  console.log(`> Monitoring transfers for ledger: ${lastLedgerStart}`);

  // Get events for "transfer" topic from the native asset contract
  const response = await rpc.getEvents({
    startLedger: !pagingToken ? lastLedgerStart : undefined,
    cursor: pagingToken,
    filters: [
      {
        contractIds: [contractId],
        // Filter for transfer events to the monitored address
        // Using wildcards (*) to match any sender and asset
        // Event structure: ["transfer", fromAddress, toAddress, assetName]
        topics: [
          [xdr.ScVal.scvSymbol("transfer").toXDR("base64"), "*", "*", "*"],
        ],
        type: "contract",
      },
    ],
    limit: 10,
  });

  // Update paging tokens for next poll
  pagingToken = undefined;
  if (response.latestLedger) {
    lastLedgerStart = response.latestLedger;
  }

  // Process events and check for payments to our monitored address
  if (response.events) {
    response.events.forEach((event) => {
      try {
        if (!eventsChecked.includes(event.id)) parseEvent(event);
      } catch (error) {
        console.error("Error processing event:", error);
      } finally {
        // Update paging token for next poll
        pagingToken = event.pagingToken;
      }
    });
  }

  // Continue polling after 5 seconds
  setTimeout(pollForTransfers, 5000);
}

const parseEvent = (event: Api.EventResponse) => {
  const topics = event.topic;
  console.log(
    chalk.gray(`Processing event: ${event.txHash} at ledger ${event.ledger}`)
  );
  eventsChecked.push(event.id);
  if (topics && topics.length >= 3) {
    // Extract recipient address from event topics
    const toAddress = Address.fromScAddress(topics[2].address()).toString();

    // Check if the payment is to our monitored address
    if (monitoredAddresses.some((addr) => toAddress === addr.toString())) {
      console.log(chalk.blue("\nPAYMENT RECEIVED!"));
      console.log(`  Transaction: ${event.txHash}`);
      console.log(`  Ledger: ${event.ledger}`);
      console.log(
        `  Sender: ${Address.fromScAddress(topics[1].address()).toString()}`
      );
      console.log(
        `  Receiver: ${Address.fromScAddress(topics[2].address()).toString()}`
      );

      const isMuxed = event.value.switch().name === xdr.ScValType.scvMap().name;

      if (isMuxed) {
        console.log("  (This is a muxed account payment)");

        event.value
          .map()
          ?.entries()
          .forEach(([_key, entry]) => {
            if (entry.val().switch().name === xdr.ScValType.scvI128().name) {
              console.log(`  Amount: ${entry.val().i128().lo().toBigInt()}`);
              return;
            }
            if (entry.val().switch().name === xdr.ScValType.scvU64().name) {
              console.log(`  Memo ID: ${entry.val().u64().toBigInt()}\n`);
              return;
            }
            throw new Error("Unexpected map entry in muxed payment event");
          });
      } else {
        console.log("  (This is a normal G account payment)");
        console.log(`  Amount: ${event.value.i128().lo().toBigInt()}\n`);
      }
    }
  }
};

// Start monitoring for payment events
console.log(
  `Starting payment monitor for: ${monitoredAddresses
    .map((addr) => addr.toString())
    .join(", ")}`
);
pollForTransfers();
