# ETH JUNGLE — 3D Treasure Hunt Prototype

A React + Vite + TypeScript browser game prototype with a low-poly 3D jungle, third-person explorer, keyboard/mobile controls, landmarks, and the original 2D hunt interface.

## Current prototype
- 3D jungle scene with trees, rocks, river, timber bridge, ancient ruins, and hidden cave
- Third-person follow camera and explorer movement
- Keyboard controls (WASD / arrow keys), jump, and interact
- Mobile on-screen joystick and action controls
- Landmark discovery state in the running game session
- Existing 2D map, clue journal, and Hall of Hunters UI
- Optional wallet setup: wallet UI stays unavailable until `VITE_REOWN_PROJECT_ID` is configured
- Optional Supabase data loading: configure the public project URL and anon key to load live hunt data

## Controls
- **W / ↑**: move forward
- **S / ↓**: move backward
- **A / ←**: move left
- **D / →**: move right
- **Space**: jump
- **E**: interact when near a landmark
- On mobile, use the on-screen joystick and action buttons.

## Local development
Requires Node.js 20+.

```bash
npm ci
npm run dev
```

Production build and browser tests:

```bash
npm run build
npm run test:e2e
npm run preview
```

## GitHub Pages
The Vite base path is configured for this repository: `/Robinhood-jungle/`.

- `.github/workflows/build.yml` runs the production build and desktop/mobile browser smoke tests for pull requests and branch pushes.
- `.github/workflows/deploy-pages.yml` deploys the `main` branch to GitHub Pages after the change is merged, or can be started manually with **workflow_dispatch**.
- In repository **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions** before the first deployment.

The deployment workflow is intentionally restricted to `main`; feature-branch work does not replace the public site.

## Safety and production requirements
This is still a prototype. The current game does not run a real ETH prize hunt or perform payouts. Do not send funds to it.

Before real prizes are enabled, implement and independently test:
1. Wallet authentication and server-side session validation.
2. Supabase schema, restrictive RLS, private answer storage, and server-side rate limiting.
3. Atomic first-correct-answer selection to prevent multiple winners.
4. A reviewed Solidity claim/payout contract and replay-resistant signed claims.
5. Robinhood Chain testnet integration, adversarial tests, and a security review before any mainnet use.

Never place a Supabase service-role key or wallet private key in frontend code or GitHub Pages build variables.
