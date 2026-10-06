/** Command-line entry point for EtherNodeDiamond. */

import { promises as fs } from 'node:fs';
import { EtherNodeDiamond, JsonRpcRequest } from './ethernodediamond';
import minimist, { ParsedArgs } from 'minimist';

interface CliArgs extends ParsedArgs {
    verbose: boolean;
    rpc?: string;
    input?: string;
    output?: string;
    timeout?: number;
    retries?: number;
}

function parsePositiveInteger(value: unknown, name: string): number | undefined {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`${name} must be a non-negative integer`);
    }
    return parsed;
}

async function readRequest(path: string): Promise<JsonRpcRequest> {
    const request = JSON.parse(await fs.readFile(path, 'utf8')) as Partial<JsonRpcRequest>;
    if (typeof request.method !== 'string' || request.method.trim() === '') {
        throw new Error('Input JSON must contain a non-empty "method" string');
    }
    if (request.params !== undefined && !Array.isArray(request.params)) {
        throw new Error('Input JSON "params" must be an array');
    }
    return { method: request.method, params: request.params };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
    try {
        const args = minimist<CliArgs>(argv, {
            boolean: ['verbose'],
            string: ['rpc', 'input', 'output'],
            alias: { v: 'verbose', r: 'rpc', i: 'input', o: 'output' },
            default: { verbose: false }
        });
        const app = new EtherNodeDiamond({
            rpcUrl: args.rpc,
            verbose: args.verbose,
            timeout: parsePositiveInteger(args.timeout, 'timeout'),
            maxRetries: parsePositiveInteger(args.retries, 'retries')
        });
        const request = args.input ? await readRequest(args.input) : undefined;
        const result = await app.execute(request);
        const rendered = JSON.stringify(result, null, 2);
        if (args.output) {
            await fs.writeFile(args.output, `${rendered}\n`, 'utf8');
            if (args.verbose) console.error(`Wrote results to ${args.output}`);
        } else {
            console.log(rendered);
        }
        return result.success ? 0 : 1;
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return 1;
    }
}

if (require.main === module) {
    void main().then(code => { process.exitCode = code; });
}
