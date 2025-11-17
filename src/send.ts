import {
  Account,
  Address,
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
import { getTypeArg, getTypeText } from "./utils/get-type-arg.ts";
import chalk from "chalk";
import { readFromJsonFile } from "./utils/io.ts";
import { Settings } from "./utils/settings-types.ts";
import { LocalSigner, SIM_ERRORS, TransactionConfig } from "@colibri/core";
import { transfer } from "./transactions/transfer.ts";

const { assetContractId, receiverMemoId, ioConfig, rpc } = config;

const sendType = getTypeArg();

console.log(
  `Preparing to send payment using type: ${chalk.blue(getTypeText(sendType))}`
);

const fromType = sendType.charAt(0);
const toType = sendType.charAt(2);

const settings = await readFromJsonFile<Settings>(ioConfig.settings);

const gAccountSigner = LocalSigner.fromSecret(settings.gAccountSecretKey);
const mAccountSigner = LocalSigner.fromSecret(settings.mAccountSecretKey);
const smartWalletContractId = settings.smartWalletContractId;
const sourceSigner = LocalSigner.fromSecret(settings.sourceSecretKey);

const txConfig: TransactionConfig = {
  source: sourceSigner.publicKey(),
  fee: "100000",
  timeout: 45,
  signers: [sourceSigner],
};

let from: string | undefined = undefined;
let to: string | undefined = undefined;
const amount: bigint = BigInt(150000000); // 15 XLM in stroops

let cAuth: undefined | xdr.SorobanAuthorizationEntry;

if (toType === "g") {
  to = gAccountSigner.publicKey();
}

if (toType === "m") {
  const muxedTo = new MuxedAccount(
    new Account(mAccountSigner.publicKey(), "0"),
    receiverMemoId
  );
  to = muxedTo.accountId();
}

if (toType === "c") {
  to = smartWalletContractId;
}

if (fromType === "m") {
  throw new Error(
    "M-Account as sender is not supported for contract transfers."
  );
}

if (fromType === "g") {
  from = gAccountSigner.publicKey();
  txConfig.signers.push(gAccountSigner);
}

if (fromType === "c") {
  from = smartWalletContractId;

  const randomNonce = new xdr.Int64(
    Math.floor(Math.random() * 100000000000000000)
  );

  const latestLedger = await rpc.getLatestLedger();
  const validUntilLedgerSeq = latestLedger.sequence + 100;

  const scValAccount = nativeToScVal(from, { type: "address" });
  const assetContractAddress = new Address(assetContractId);
  cAuth = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: scValAccount.address(),
        nonce: randomNonce,
        signatureExpirationLedger: Number(validUntilLedgerSeq),
        signature: xdr.ScVal.scvVoid(), // Placeholder, no signature is required for this contract
      })
    ),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new xdr.InvokeContractArgs({
            contractAddress: assetContractAddress.toScAddress(),
            functionName: "transfer",
            args: [
              scValAccount,
              nativeToScVal(to, { type: "address" }),
              nativeToScVal(amount.toString(), { type: "i128" }),
            ],
          })
        ),
      subInvocations: [],
    }),
  });
}

if (from === undefined || to === undefined) {
  throw new Error("From or To address is not set correctly.");
}
const auth = cAuth ? [cAuth] : undefined;

await transfer(
  assetContractId,
  txConfig,
  {
    from,
    to,
    amount,
  },
  auth
).catch((error) => {
  console.error("Error during transfer:", error);
  // console.error(
  //   (error as SIM_ERRORS.SIMULATION_FAILED).meta.data.input.transaction.toXDR()
  // );
  Deno.exit(1);
});
