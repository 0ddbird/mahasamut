# Mahasamut · มหาสมุด

Short games to learn to read Thai script, served at <https://mahasamut.app>.

The name is a pun on _mahasamut_: spelled **มหาสมุด** (from มหา _maha_, "great", and สมุด _samut_, "notebook") rather than มหาสมุทร ("ocean"), it means **"great notebook"**.

## Games

In the order the site lists them, from the letters to the syllable:

- **Vowel sounds** (`/vowel`) — Read a Thai vowel and find how it sounds, among answers written in the International Phonetic Alphabet and played aloud.
- **Consonant classes** (`/consonant-class`) — Read a Thai consonant and find its class (`mid`, `high`, or `low`), the first step towards the tone of a syllable.
- **Find the tone** (`/syllable`) — Read a one-syllable Thai word and find its tone, either step by step (consonant class, tone mark, vowel length, final, live or dead) or by tone alone.

Each game can be played as an endless run or a fixed series, untimed or timed, with optional cheat sheets for the reading rules in learning mode.

## Development

Requires **Node 24** (`.nvmrc`).

```bash
npm install
npm run dev            # start the Vite dev server
npm run dev:server     # start the unified backend (contact, multiplayer, metrics), in a second terminal
```

The unified backend listens on `127.0.0.1:3002`, and the Vite dev server proxies `/api` and `/socket.io` to it. Without `RESEND_API_KEY` set, it prints contact messages in its terminal instead of sending them. Set `CONTACT_PORT` or `CONTACT_ORIGIN` to change the port or the allowed origin (`http://localhost:5173` outside production). In development, metrics persist in memory unless `STATS_DB_PATH` is specified.

### Checks and build

```bash
npm test               # run the Vitest test suite once
npm run test:watch     # run Vitest in watch mode
npm run lint           # lint with Oxlint
npm run format:check   # check formatting with Prettier
npm run format         # format with Prettier
npm run build          # type-check (tsc -b) and build client into dist/
npm run build:server   # bundle the backend server into dist-server/
npm run preview        # preview the production build locally
```

## Privacy & Analytics

Mahasamut collects strictly anonymous usage metrics (page views, games started/finished, audio plays) to understand site vitality without any personal data:

- No cookies, no local storage trackers, and no visitor identifiers.
- No IP addresses are stored on disk or transmitted to metrics collectors.
- All tracked routes and event properties use closed-set enums.
- Counters are stored locally on the VPS in SQLite (`/var/lib/mahasamut/stats.db`) and exposed via a local Prometheus `/metrics` endpoint.

## Deployment

Server provisioning and deployment live in the companion repository [`0ddbird/mahasamut-infra`](https://github.com/0ddbird/mahasamut-infra).

After pushing to GitHub, deploy from `mahasamut-infra`:

```bash
just deploy            # build and publish origin/main on https://mahasamut.app
just deploy <ref>      # publish a specific branch, tag, or commit
```
