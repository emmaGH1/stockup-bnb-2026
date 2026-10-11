# Judge flow: reproduce the technical claims

This is the shortest honest path to check Stockup's claims. It needs **no funds, no wallet, and no keys**.
Every step is either a local command or a read-only request to public endpoints. Nothing here sends a transaction.

Anything marked **NOT VERIFIED** is not claimed as working. See `README.md`.

---

## 1. Build and test (about 3 minutes)

```bash
git clone <repo> stockup && cd stockup
git checkout dev/core-engineering     # or the commit listed in docs/CURRENT_STATE.md
npm ci
npm run typecheck                     # expect: exit 0, no output
npm test                              # expect: "Tests 144 passed"
npm run build                         # expect: "Compiled successfully", routes listed
```

What this proves: the code type-checks, the 105 unit tests pass, and it builds for production.
What it does not prove: anything about live chains or wallets.

## 2. Run the app and check the live pipeline (about 2 minutes)

```bash
npm start            # serves on http://localhost:3000 (Next.js default; use -p to change)
```

In a second terminal, ask the server to run the whole journey for a $100 Amazon purchase with a $5 investment.

**Use a recipient that is unfunded on BSC.** Generate a new address (for example `node --input-type=module -e "import('viem/accounts').then(m=>console.log(m.privateKeyToAccount(m.generatePrivateKey()).address))"`) and discard its key. Do **not** use a well-known address: `0x000000000000000000000000000000000000dEaD` (the burn address, about 16.5 million BNB) and `0x0000000000000000000000000000000000000001` (35 BNB) are both funded, so the server will release a transaction for them. Releasing a transaction for a funded address is correct behavior, but it is not a safe demo input. Check the recipient's balance first with `getBalance`.

```bash
curl -s -X POST http://localhost:3000/api/own \
  -H 'content-type: application/json' \
  -d '{"merchant":"AMAZON.COM*2K4","spendUsd":100,"recipient":"<UNFUNDED_ADDRESS>"}' \
  | python3 -m json.tool | head -60
```

**Expected:**
- `identification`: identified as Amazon (AMZN).
- `instrument.symbol`: `AMZNon`, address `0x4553cFe1C09f37f38b12dC509F676964e392F8Fc`, `verifiedOnChain: true`.
- `outcome`: `not_eligible`, because the unfunded recipient has no BNB. The blocker is listed as `wallet_funds`.
- No `tx` is released. This is the correct behavior for an unfunded recipient.
- If the outcome is `ready_to_sign`, the recipient you used is funded. Stop, and use an unfunded address.

What this proves: company identification, instrument discovery against Binance's listing and the on-chain symbol, and that the server refuses to release a transaction without funds.
What it does not prove: a successful trade. Nothing has been sent.

## 3. Check the quote (about 1 minute, read-only)

```bash
curl -s -X POST http://localhost:3000/api/plan \
  -H 'content-type: application/json' \
  -d '{"symbol":"AMZNon","tokenAddress":"0x4553cFe1C09f37f38b12dC509F676964e392F8Fc","bnb":"0.00666445","recipient":"<UNFUNDED_ADDRESS>","status":{"symbol":"AMZNon","source":"live","session":"open"}}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print({k:d.get(k) for k in ['quotedOut','minOut','impactBps','impactIncludingFeeBps','gasUnits']});print('guard',d['guard']['allowed'],'simulation',d['simulation']['ok'])"
```

**Expected** (values move with live pool state; compare by order of magnitude, not exact digits):
- `quotedOut` about 0.019 AMZNon; `minOut` about 1% lower.
- `impactBps` about 15 and `impactIncludingFeeBps` about 40 at the time of writing.
- `guard True`, `simulation True`.

Note that `simulation True` is an `eth_call` against live state with a state override. It proves the calldata executes, not that a trade happened.

## 4. Live Binance and on-chain checks (about 2 minutes)

```bash
npx tsx scripts/probe-binance-public.ts     # expect: 4 x PASS
RECIPIENT=<UNFUNDED_ADDRESS> npx tsx scripts/revalidate-trade.ts
```

**Expected from the probe:** all four public endpoints return the fields the code reads.
**Expected from the revalidation:** the Binance list entry matches the on-chain symbol, the calldata targets the PancakeSwap V2 router, and the server returns `not_eligible` with `wallet_funds` as the only blocker.

The revalidation reads and never signs. The `not_eligible` result with `wallet_funds` is the expected result for an unfunded recipient. To check calldata, simulation and gas, a funded recipient is needed; use one you control and never a well-known address.

## 5. Unit-level proofs of the trust rules (about 1 minute)

```bash
npx vitest run test/review.test.ts      # calldata tamper cases (recipient, minimum, path, router, value, deadline, chain)
npx vitest run test/settle.test.ts      # settlement refused for wrong router, sender, path, recipient, amount, non-swap calldata
npx vitest run test/receipt.test.ts     # receipt refused unless settled, final, listed and symbol-matched
npx vitest run test/claims.test.ts      # no success wording in the UI; no cashback language
```

## 6. The part that is NOT demonstrated

- No real Stockup transaction has been sent. Settlement verification has been validated on a historical mainnet swap that Stockup did not make, and on no Stockup swap.
- No ownership receipt for a Stockup trade exists.
- A real wallet extension or mobile wallet browser has not been tested; the wallet path used a mock provider.

These gaps are deliberate. The product will not claim them until the human approves a capped, real test (see `docs/MAINNET_TEST_PROCEDURE.md`).

---

## Quick reference: what each section proves

| Section | Proves | Does not prove |
|---|---|---|
| 1 | Code type-checks, tests pass, production build | Anything live |
| 2 | Identification, discovery, server refusal without funds | A trade |
| 3 | Live quote, guard, simulation, two impact figures | That a trade happened |
| 4 | Public Binance data matches the on-chain token | Issuer identity |
| 5 | Trust rules hold in unit tests | Live behavior |
