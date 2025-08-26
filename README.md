# stellar-muxed-example

This repo contains an example of transfers involving muxed addresses and how to ingest these events.

## Requirements

- [Deno](https://deno.land/) - Modern runtime for JavaScript and TypeScript

## Setup

1. Copy the environment configuration:

   ```bash
   cp .env.example .env
   ```

   The `.env` is configured by default to use testnet. Adjust its parameters to also include accounts that have initialized in testnet and a memo id.

## Usage

### Ingest

Run the following command to start the ingestion process:

```bash
deno task ingest
```

This will start a process that fetches the latest events every 5 seconds and filters for `transfer` events involving the receiver account.

When an event is identified, it will be parsed and logged to console. Muxed events will be identified and the memo id will be printed too.

### Send Payment

To send a payment to the receiver account use one of the commands below:

Send a payment to the encoded Muxed addres:

```bash
deno task send:muxed
```

Send a payment to the native G addres:

```bash
deno task send:native
```
