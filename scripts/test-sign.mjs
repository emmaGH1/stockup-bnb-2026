import { sign } from '../src/w3w-client.mjs';
import crypto from 'node:crypto';
const s = sign({ secret: 'k', timestamp: 'T', method: 'post', path: '/build/x', body: '{}' });
const e = crypto.createHmac('sha256','k').update('TPOST/build/x{}').digest('base64');
if (s !== e) { console.error('FAIL'); process.exit(1); } console.log('sign ok');
