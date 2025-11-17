import { Asset, Networks } from "@stellar/stellar-sdk";
import {
  ContractId,
  FutureNet,
  MainNet,
  NetworkConfig,
  TestNet,
} from "@colibri/core";
import { Server } from "stellar-sdk/rpc";

export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    console.error(
      `Error: Environment variable ${key} is not set.\nCheck the 'Setup' section of the README.md file.`
    );

    throw new Error(`Required environment variable ${key} is not set. `);
  }
  return value;
}

export function getOptionalEnv(key: string): string | undefined {
  return Deno.env.get(key);
}

const networkEnv = getRequiredEnv("NETWORK").toLowerCase();

const networkKey =
  networkEnv === "mainnet" ? "PUBLIC" : networkEnv.toUpperCase();

if (!(networkKey in Networks)) {
  throw new Error(
    `Invalid NETWORK value: ${networkEnv}. Must be one of: ${Object.keys(
      Networks
    )
      .join(", ")
      .toLowerCase()}`
  );
}

export const stellarNetwork = Networks[networkKey as keyof typeof Networks];

let networkConfig: NetworkConfig;

switch (stellarNetwork) {
  case Networks.PUBLIC:
    networkConfig = MainNet();
    break;
  case Networks.TESTNET:
    networkConfig = TestNet();
    break;
  case Networks.FUTURENET:
    networkConfig = FutureNet();
    break;
  default:
    throw new Error(
      `Network configuration not defined for network: ${stellarNetwork}`
    );
}

export const getRpc = () => {
  return new Server(getRequiredEnv("STELLAR_RPC_URL"), { allowHttp: true });
};

export const config = {
  network: stellarNetwork,
  networkConfig: networkConfig,
  receiverMemoId: getRequiredEnv("RECEIVER_MEMO_ID"),
  assetContractId: Asset.native().contractId(stellarNetwork) as ContractId,
  rpc: getRpc(),
  wasmDir: "./target/wasm32v1-none/release/",
  ioConfig: {
    outputDirectory: "./.json",
    settings: "settings",
  },
};
