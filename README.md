# ETH JUNGLE — Playable UI Prototype

A React + Vite + TypeScript pixel-jungle treasure hunt interface.

## What's included
- Responsive landing page and jungle-map UI
- 8×8 clickable map tiles
- Tile investigation interactions and discovery counters
- Clue journal with unlock progression
- Hall of Hunters placeholder
- Demo wallet button (does **not** connect a real wallet)
- Daily prize presentation (does **not** hold or pay real ETH)
- Mobile responsive navigation
- Robinhood Chain testnet label for prototype context

## Important
This is a **frontend-only prototype**. It has no Supabase connection, no contract integration, no real wallet connection, no real prize, and no secure winner selection. Do not send funds to this prototype.

## Run locally
Install Node.js 20+ then:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## GitHub Pages
In `vite.config.ts`, change `base: '/'` to `base: '/YOUR-REPOSITORY-NAME/'` for a project site. Add a GitHub Actions workflow to build and deploy `dist/` to Pages, or configure Pages to use the build workflow. For a custom domain or `username.github.io` root site, use `/`.

## Next production steps
1. Add SIWE wallet authentication.
2. Add Supabase schema, RLS, private answer storage and server-side rate limiting.
3. Implement atomic first-correct-answer selection.
4. Implement and test EIP-712 signed claims in a Solidity contract.
5. Deploy to Robinhood Chain testnet (chain ID `46630`) and test prize rollover/payout.
6. Complete security review before mainnet use.
