# Stellar Muxed Account Example

A comprehensive example demonstrating different payment methods on the Stellar network, including G-Accounts, Muxed Accounts, and Smart Contract wallets.

## Overview

This project showcases three types of payment transfers on Stellar:

- **G-Account to G-Account** (`g2g`) - Standard Stellar account transfers
- **G-Account to Muxed Account** (`g2m`) - Transfers to muxed addresses with memo IDs
- **G-Account to Smart Contract** (`g2c`) - Transfers to contract-controlled wallets
- **Smart Contract to G-Account** (`c2g`) - Transfers from contract wallets
- **Smart Contract to Muxed Account** (`c2m`) - Contract to muxed address transfers
- **Smart Contract to Smart Contract** (`c2c`) - Contract to contract transfers

## Prerequisites

- [Deno](https://deno.land/) runtime installed
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) installed
- Access to Stellar Testnet (configured via environment variables)

## Environment Setup

Create a `.env` file in the project root:

```env
# Stellar Network Configuration
NETWORK=testnet  # testnet | mainnet | futurenet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org

# Receiver Muxed Account Configuration
RECEIVER_MEMO_ID=1234567890123422222
```

- `NETWORK`: The Stellar network to use (testnet, mainnet, or futurenet)
- `STELLAR_RPC_URL`: RPC endpoint URL for the selected network
- `RECEIVER_MEMO_ID`: The memo ID used for muxed account addressing

## Installation & Setup

### 1. Build the Smart Contract

The project uses a Rust-based smart contract that needs to be compiled:

```bash
stellar contract build
```

This will generate the WASM file in the `target/wasm32v1-none/release/` directory.

### 2. Run Initial Setup

The setup script will:

- Create and fund test accounts (G-Account, M-Account source accounts)
- Upload and deploy the smart contract
- Fund the smart contract with XLM
- Save configuration to `settings.json`

```bash
deno task setup
```

After running, you'll have:

- A deployed smart contract with a bypass authentication mechanism
- Three funded accounts (source, G-Account, M-Account)
- Settings saved in `settings.json`

## Usage

### Sending Payments

The `send` command transfers 15 XLM between different account types:

```bash
deno task send <transfer-type>
```

**Transfer Types:**

- `g2g` - G-Account to G-Account
- `g2m` - G-Account to Muxed Account
- `g2c` - G-Account to Smart Contract
- `c2g` - Smart Contract to G-Account
- `c2m` - Smart Contract to Muxed Account
- `c2c` - Smart Contract to Smart Contract

**Examples:**

```bash
# Send from G-Account to Muxed Account
deno task send g2m

# Send from Smart Contract to G-Account
deno task send c2g
```

### Monitoring Events

The ingestion service monitors the network for XLM transfers to your configured accounts:

```bash
deno task ingest
```

This will:

- Poll for new ledgers every 5 seconds
- Monitor transfers to your G-Account, M-Account, and Smart Contract
- Detect and log incoming payments with details:
  - Transaction hash
  - Ledger number
  - Sender and receiver addresses
  - Payment amount
  - Muxed account memo ID (if applicable)

**Example Output:**

```
> Monitoring transfers for ledger: 123456

PAYMENT RECEIVED!
  Transaction: abc123...
  Ledger: 123456
  Sender: GABC...
  Receiver: MDEF... (Muxed)
  (This is a muxed account payment)
  Amount: 150000000
  Memo ID: 1234567890
```

## Project Structure

```
stellar-muxed-example/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── transactions/
│   │   └── transfer.ts         # Transfer transaction builder
│   ├── utils/
│   │   ├── get-type-arg.ts    # CLI argument parser
│   │   ├── get-address-arg.ts # Address utilities
│   │   ├── io.ts              # File I/O helpers
│   │   └── settings-types.ts  # TypeScript types
│   ├── setup.ts               # Initial setup script
│   ├── send.ts                # Payment sender
│   └── ingest-events.ts       # Event monitoring
├── target/                     # Compiled WASM contracts
├── .env                       # Environment variables
├── settings.json              # Generated account settings
└── deno.json                  # Deno configuration
```

## How It Works

### Smart Contract Wallet

The project uses a custom Rust smart contract (`auth_bypass.wasm`) that:

- Stores XLM on behalf of users
- Allows transfers without traditional Stellar signatures
- Demonstrates contract-based authentication patterns

### Muxed Accounts

Muxed accounts allow multiple virtual accounts to share a single Stellar address using memo IDs:

- Receiver memo ID is configured in the environment
- Events include the memo ID in the transfer data
- Useful for exchanges and payment processors

### Event Ingestion

The ingestion system:

- Uses the Stellar RPC `getEvents` API
- Filters for `transfer` events on the native XLM contract
- Parses event topics to extract sender and receiver
- Distinguishes between normal and muxed account payments

## Development

### Available Tasks

```bash
deno task setup    # Initialize accounts and deploy contract
deno task send     # Send payment (requires transfer type argument)
deno task ingest   # Start event monitoring
```

### Modifying Settings

After initial setup, you can modify `settings.json` to:

- Change account keys
- Update contract ID
- Adjust monitored addresses

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Smart Contracts](https://soroban.stellar.org/)
- [Muxed Accounts Spec](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0027.md)
- [Stellar SDK](https://github.com/stellar/js-stellar-sdk)

## License

MIT
