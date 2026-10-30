# SolveTogether

Independent React + Vite + TypeScript application in this repository. The existing Robinhood Jungle game at the repository root is intentionally untouched.

## Run
```bash
cd solvetogether
npm install
cp .env.example .env
npm run dev
```

Run `supabase/schema.sql` in the Supabase SQL Editor, then add your project URL and anon/publishable key to `.env`. Never expose the service-role key.

Without credentials the app shows clearly-labelled sample content. Authentication, publishing and contributions require Supabase.

## Deploy
Build with `npm run build` inside this folder. The output is `solvetogether/dist`. Deploy that directory to a static host. For GitHub Pages, publish the built contents to a dedicated branch or configure a Pages workflow to use this folder's build output. The current root Pages deployment remains the Robinhood Jungle game.