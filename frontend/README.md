# Forma Kanban

One board, five renameable columns, title/details cards, and pointer/touch/keyboard drag and drop. State resets on reload.

```sh
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Browser tests: `npx playwright install chromium`, then `npm run test:e2e` (desktop and mobile).

TypeScript 6 and ESLint 9 are pinned to the versions supported by the Next.js lint configuration.
