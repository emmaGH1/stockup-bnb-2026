// Reports which env vars are set, never prints values.
for (const k of ['BSC_RPC_URL', 'W3W_API_BASE', 'W3W_API_KEY', 'W3W_API_SECRET']) console.log(k, process.env[k] ? 'set' : 'missing');
