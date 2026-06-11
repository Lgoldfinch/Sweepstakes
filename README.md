# Sweepstakes

A self-hosted, domain-agnostic sweepstakes app. Add a list of **entrants** and a list of **options** (e.g. football teams), then **spin the wheel** for a fair, seeded draw. Built initially for football but designed to expand to any domain (F1, horse racing, Eurovision, …) via presets.

## Features

- **Wheel spinner** that randomly assigns entrants to options with a satisfying animation and confetti finish.
- **Fair, seeded draws**: randomness runs server-side (seeded Fisher-Yates), the seed is stored, and the wheel merely *reveals* the result so it can't be tampered with in the browser.
- **Two draw modes**:
  - _One option per entrant_ (equal counts), or
  - _Multiple options per entrant_ (options shared out evenly when there are more options than people).
- **Category presets**: World Cup (32), Premier League (20), F1 grid (20), or blank/custom. Adding a new domain is just a new entry in `backend/src/presets.ts`.
- **Side prizes** (e.g. _golden boot_): configurable per sweepstake, winners recorded manually as real-world events conclude.
- **Prize pot tracking**: optional stake per entrant, total pot, and a configurable payout split.
- **Shareable**: every sweepstake has a short link and a QR code. No accounts needed — anyone with the link can view and manage it.
- **Export & redraw**: download results as CSV, or reset back to draft and redraw.
- **Persistent**: SQLite stored on a Docker volume; results survive restarts.

### Possible future features (roadmap)
- Live multi-viewer sync via WebSockets (everyone watches the same spin on a big screen).
- Option metadata (team flags/logos/colours) rendered on the wheel.
- Read-only share links separate from an admin link.
- Printable / shareable results card (PNG image).

## Architecture

```
frontend (React + TS + Vite, nginx)  ──/api──▶  backend (Express + TS)  ──Prisma──▶  SQLite (volume)
```

- `frontend/` — React SPA with the animated SVG wheel. Built and served by nginx, which also proxies `/api` to the backend.
- `backend/` — Express + TypeScript REST API, Prisma ORM over SQLite.

## Quick start (Docker)

```bash
docker compose up --build
```

Then open <http://localhost:8080>.

If port 8080 is already in use, pick another:

```bash
FRONTEND_PORT=8088 docker compose up --build   # then open http://localhost:8088
```

Data is persisted in the `sweepstakes-data` Docker volume.

## Local development

Run the backend and frontend in two terminals.

**Backend:**

```bash
cd backend
cp .env.example .env        # sets DATABASE_URL and PORT
npm install
npx prisma generate
npx prisma db push          # creates the SQLite schema
npm run dev                 # http://localhost:4000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :4000)
```

## API reference

| Method | Path                                   | Description                                  |
| ------ | -------------------------------------- | -------------------------------------------- |
| GET    | `/api/health`                          | Health check                                 |
| GET    | `/api/presets`                         | List categories and presets                  |
| POST   | `/api/sweepstakes`                     | Create a sweepstake (DRAFT)                  |
| GET    | `/api/sweepstakes/:id`                 | Fetch full state (used by the share link)    |
| PUT    | `/api/sweepstakes/:id`                 | Edit entrants/options/side prizes (DRAFT)    |
| POST   | `/api/sweepstakes/:id/draw`            | Run the seeded draw, returns ordered reveals |
| POST   | `/api/sweepstakes/:id/reset`           | Clear the draw back to DRAFT                 |
| PUT    | `/api/sweepstakes/:id/side-prizes/:pid`| Record a side-prize winner                   |
| DELETE | `/api/sweepstakes/:id`                 | Delete a sweepstake                          |

## Extending to new domains

The core model only knows about generic `entrants` and `options`. To add a new category (say "darts"), add a `Preset` to `backend/src/presets.ts` with its options and any default side prizes — no schema or UI changes required.
```ts
{
  id: "pdc-wc",
  category: "darts",
  label: "Darts World Championship",
  description: "...",
  options: ["Luke Humphries", "Luke Littler", /* ... */],
  sidePrizes: [{ name: "Highest Checkout" }],
}
```

## Project structure

```
Sweepstakes/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.ts            # Express app
│       ├── db.ts               # Prisma client
│       ├── presets.ts          # Category presets
│       ├── services/draw.ts    # Seeded draw logic
│       ├── routes/             # REST endpoints
│       └── util/random.ts      # Seeded PRNG + ids
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── pages/              # Create + sweepstake/results pages
        └── components/         # Wheel, Confetti, ShareBox
```
