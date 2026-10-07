const assert = require('node:assert/strict');
const { afterEach, describe, test } = require('node:test');
const { EtherNodeDiamond } = require('../dist/ethernodediamond');

const originalFetch = global.fetch;

function rpcResponse(result) {
    return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ jsonrpc: '2.0', id: 1, result })
    });
}

describe('EtherNodeDiamond', () => {
    afterEach(() => { global.fetch = originalFetch; });

    test('runs real node diagnostics through Ethereum JSON-RPC', async () => {
        const responses = ['0x1', '0x10', 'TestClient/v1.0'];
        let calls = 0;
        global.fetch = () => { calls += 1; return rpcResponse(responses.shift()); };
        const client = new EtherNodeDiamond({ rpcUrl: 'https://rpc.example', maxRetries: 0 });
        const result = await client.execute();
        assert.equal(result.success, true);
        assert.deepEqual(result.data, {
            rpcUrl: 'https://rpc.example',
            chainId: 1,
            chainIdHex: '0x1',
            blockNumber: 16,
            blockNumberHex: '0x10',
            clientVersion: 'TestClient/v1.0'
        });
        assert.equal(calls, 3);
    });

    test('executes an arbitrary JSON-RPC request', async () => {
        global.fetch = () => rpcResponse('0xabc');
        const client = new EtherNodeDiamond({ rpcUrl: 'https://rpc.example', maxRetries: 0 });
        const result = await client.execute({ method: 'eth_getBalance', params: ['0x123', 'latest'] });
        assert.equal(result.success, true);
        assert.equal(result.data, '0xabc');
    });

    test('returns useful JSON-RPC errors', async () => {
        global.fetch = async () => ({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } })
        });
        const client = new EtherNodeDiamond({ rpcUrl: 'https://rpc.example', maxRetries: 0 });
        const result = await client.execute({ method: 'missing_method' });
        assert.equal(result.success, false);
        assert.match(result.message, /Method not found/);
    });
});
