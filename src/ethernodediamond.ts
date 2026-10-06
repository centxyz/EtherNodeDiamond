/** Lightweight Ethereum JSON-RPC client and node diagnostics. */

export interface EtherNodeDiamondConfig {
    rpcUrl?: string;
    verbose?: boolean;
    timeout?: number;
    maxRetries?: number;
}

export interface JsonRpcRequest {
    method: string;
    params?: unknown[];
}

export interface NodeDiagnostics {
    rpcUrl: string;
    chainId: number;
    chainIdHex: string;
    blockNumber: number;
    blockNumberHex: string;
    clientVersion: string;
}

export interface ProcessResult<T = unknown> {
    success: boolean;
    data?: T;
    message: string;
    timestamp: Date;
}

interface JsonRpcResponse<T> {
    jsonrpc: '2.0';
    id: number;
    result?: T;
    error?: { code: number; message: string; data?: unknown };
}

export class EtherNodeDiamond {
    private readonly config: Required<EtherNodeDiamondConfig>;
    private processed = 0;
    private requestId = 0;

    constructor(config: EtherNodeDiamondConfig = {}) {
        this.config = {
            rpcUrl: config.rpcUrl ?? process.env.ETH_RPC_URL ?? 'http://127.0.0.1:8545',
            verbose: config.verbose ?? false,
            timeout: config.timeout ?? 10000,
            maxRetries: config.maxRetries ?? 2
        };
    }

    async execute(request?: JsonRpcRequest): Promise<ProcessResult> {
        const startedAt = Date.now();
        try {
            const data = request
                ? await this.call(request.method, request.params ?? [])
                : await this.diagnose();
            this.processed++;
            this.log(`Request completed in ${Date.now() - startedAt}ms`);
            return {
                success: true,
                data,
                message: request
                    ? `JSON-RPC method ${request.method} completed successfully`
                    : 'Ethereum node diagnostics completed successfully',
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }

    async diagnose(): Promise<NodeDiagnostics> {
        const [chainIdHex, blockNumberHex, clientVersion] = await Promise.all([
            this.call<string>('eth_chainId'),
            this.call<string>('eth_blockNumber'),
            this.call<string>('web3_clientVersion')
        ]);
        return {
            rpcUrl: this.config.rpcUrl,
            chainId: this.parseHexQuantity(chainIdHex, 'chain ID'),
            chainIdHex,
            blockNumber: this.parseHexQuantity(blockNumberHex, 'block number'),
            blockNumberHex,
            clientVersion
        };
    }

    async call<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
        if (!method.trim()) throw new Error('JSON-RPC method must not be empty');

        let lastError: unknown;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            try {
                this.log(`Calling ${method} (attempt ${attempt + 1})`);
                const response = await fetch(this.config.rpcUrl, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: ++this.requestId,
                        method,
                        params
                    }),
                    signal: controller.signal
                });
                if (!response.ok) {
                    throw new Error(`RPC HTTP ${response.status}: ${response.statusText}`);
                }
                const payload = await response.json() as JsonRpcResponse<T>;
                if (payload.error) {
                    throw new Error(`RPC ${payload.error.code}: ${payload.error.message}`);
                }
                if (!Object.prototype.hasOwnProperty.call(payload, 'result')) {
                    throw new Error('RPC response did not contain a result');
                }
                return payload.result as T;
            } catch (error) {
                lastError = error;
                if (attempt < this.config.maxRetries) {
                    await this.delay(Math.min(250 * (attempt + 1), 1000));
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }
        if (lastError instanceof Error && lastError.name === 'AbortError') {
            throw new Error(`RPC request timed out after ${this.config.timeout}ms`);
        }
        throw lastError instanceof Error ? lastError : new Error('RPC request failed');
    }

    getStatistics(): object {
        return {
            processed: this.processed,
            rpcUrl: this.config.rpcUrl,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries
        };
    }

    private parseHexQuantity(value: string, label: string): number {
        if (!/^0x[0-9a-f]+$/i.test(value)) {
            throw new Error(`Invalid ${label} returned by RPC node: ${value}`);
        }
        return Number.parseInt(value.slice(2), 16);
    }

    private log(message: string): void {
        if (this.config.verbose) console.error(`[EtherNodeDiamond] ${message}`);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
