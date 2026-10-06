const { EtherNodeDiamond } = require('../dist/ethernodediamond');

function rpcResponse(result) {
    return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ jsonrpc: '2.0', id: 1, result })
    });
}

describe('EtherNodeDiamond', () => {
    afterEach(() => jest.restoreAllMocks());

    test('runs real node diagnostics through Ethereum JSON-RPC', async () => {
        const fetchMock = jest.spyOn(global, 'fetch')
            .mockImplementationOnce(() => rpcResponse('0x1'))
            .mockImplementationOnce(() => rpcResponse('0x10'))
            .mockImplementationOnce(() => rpcResponse('TestClient/v1.0'));
        const client = new EtherNodeDiamond({ rpcUrl: 'https://rpc.example', maxRetries: 0 });
        const result = await client.execute();
        expect(result.success).toBe(true);
        expect(result.data).toEqual({
            rpcUrl: 'https://rpc.example',
            chainId: 1,
            chainIdHex: '0x1',
            blockNumber: 16,
            blockNumberHex: '0x10',
            clientVersion: 'TestClient/v1.0'
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test('executes an arbitrary JSON-RPC request', async () => {
        jest.spyOn(global, 'fetch').mockImplementationOnce(() => rpcResponse('0xabc'));
        const client = new EtherNodeDiamond({ rpcUrl: 'https://rpc.example', maxRetries: 0 });
        const result = await client.execute({ method: 'eth_getBalance', params: ['0x123', 'latest'] });
        expect(result.success).toBe(true);
        expect(result.data).toBe('0xabc');
    });

    test('returns useful JSON-RPC errors', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } })
        });
        const client = new EtherNodeDiamond({ rpcUrl: 'https://rpc.example', maxRetries: 0 });
        const result = await client.execute({ method: 'missing_method' });
        expect(result.success).toBe(false);
        expect(result.message).toContain('Method not found');
    });
});
