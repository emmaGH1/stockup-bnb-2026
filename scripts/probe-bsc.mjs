// Feasibility probe: BSC RPC reachable + chain id 56. No secrets, read-only.
const url = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
const rpc = async (method, params = []) => (await (await fetch(url, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})).json()).result;
console.log('chainId', parseInt(await rpc('eth_chainId'), 16));
console.log('block', parseInt(await rpc('eth_blockNumber'), 16));
