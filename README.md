# RPCSurveyor

[![CI](https://github.com/centxyz/RPCSurveyor/actions/workflows/ci.yml/badge.svg)](https://github.com/centxyz/RPCSurveyor/actions/workflows/ci.yml)

RPCSurveyor is a small TypeScript command-line client for checking an Ethereum-compatible JSON-RPC node and making individual JSON-RPC calls.

It reports the connected node's chain ID, latest block number, and client version. It does not deploy or execute smart contracts.

## Requirements

- Node.js 18 or newer
- Access to an Ethereum-compatible JSON-RPC endpoint

## Installation

```bash
git clone https://github.com/centxyz/RPCSurveyor.git
cd RPCSurveyor
npm install
npm run build
```

## Run node diagnostics

Pass an RPC endpoint with `--rpc` or set `ETH_RPC_URL`:

```bash
npm start -- --rpc https://your-rpc-endpoint.example --verbose
```

The default endpoint is `http://127.0.0.1:8545`.

## Make a JSON-RPC call

Create `request.json`:

```json
{
  "method": "eth_getBalance",
  "params": ["0x0000000000000000000000000000000000000000", "latest"]
}
```

Run it and optionally save the response:

```bash
npm start -- --rpc https://your-rpc-endpoint.example --input request.json --output result.json
```

## Options

- `--rpc`, `-r`: Ethereum JSON-RPC endpoint
- `--input`, `-i`: JSON file containing a `method` and optional `params` array
- `--output`, `-o`: write the JSON result to a file
- `--timeout`: request timeout in milliseconds (default: `10000`)
- `--retries`: retry count after the first attempt (default: `2`)
- `--verbose`, `-v`: print diagnostic progress to stderr

## Development

```bash
npm run build
npm test
```

## License

Released under the [MIT License](https://github.com/centxyz/RPCSurveyor/blob/main/LICENSE).

## Current limitations

- Results reflect a single configured RPC endpoint and do not independently verify chain consensus.
- Retries cannot make non-idempotent custom RPC methods safe.
- The tool does not manage keys, deploy contracts, or broadcast signed transactions.
