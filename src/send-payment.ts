import {
  Account,
  Asset,
  MuxedAccount,
  nativeToScVal,
  Operation,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { config } from "./config/env.ts";
import { sendTransaction } from "./utils/send-transaction-fn.ts";
import { getAddressArg } from "./utils/get-address-arg.ts";

const { senderKeys, receiverKeys, rpc, network, memoId } = config;

const addressType = getAddressArg();

// User the RPC to load the source account data from the ledger
// This ensures the accounts exist and also retrieves the current sequence
// number for the sender account.
let senderAccount: Account;
try {
  senderAccount = await rpc.getAccount(senderKeys.publicKey());
} catch (error) {
  console.error("Error checking source account:", error);
  throw error;
}

let receiverAccount: Account;
try {
  receiverAccount = await rpc.getAccount(receiverKeys.publicKey());
} catch (error) {
  console.error("Error checking destination account:", error);
  throw error;
}

// ===================================================
// Encode the arguments for a 'transfer' invocation
// ===================================================
const xlm = Asset.native();

const fromAddress = nativeToScVal(senderKeys.publicKey(), {
  type: "address",
});

let toAddress: xdr.ScVal;

// Set the receiver address according to the ARG provided
// use send:muxed for muxed accounts
// or send:native for native addresses
if (addressType === "muxed") {
  const muxedReceiver = new MuxedAccount(
    receiverAccount,
    receiverAccount.sequenceNumber()
  );

  muxedReceiver.setId(memoId);

  console.log(
    `Muxed Account encoded with PK: ${receiverAccount.accountId()} and ID: ${muxedReceiver.id()} \n => ${muxedReceiver.accountId()}`
  );

  toAddress = nativeToScVal(muxedReceiver.accountId(), {
    type: "address",
  });
} else {
  toAddress = nativeToScVal(receiverAccount.accountId(), {
    type: "address",
  });
}

const amount = nativeToScVal(BigInt(10_0000000), {
  type: "i128",
});
const args: xdr.ScVal[] = [fromAddress, toAddress, amount];

// ===================================================
// Prepare additional data for the transaction
// ===================================================

// The inclusion fee is the fee charged for including the transaction in a ledger
const inclusionFee = 1000;

// ===================================================
// Assemble the transaction object
// ===================================================
const tx = new TransactionBuilder(senderAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: xlm.contractId(network),
      function: "transfer",
      args,
    })
  )
  .setTimeout(90)
  .build();

// Since we're using the RPC and this transaction will only require the
// source-account authorization, we won't need to extract and sign indivitual
// authorization entries. Instead, we can directly use the 'prepareTransaction' feature
// to simulate and update the transaction object automatically
const simulatedTransaction = await rpc.prepareTransaction(tx);

// Sign the transaction with the source account keypair
simulatedTransaction.sign(senderKeys);

// send the transaction to the network
await sendTransaction(simulatedTransaction);
