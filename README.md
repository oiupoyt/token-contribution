# token-contribution

> GitHub-style daily token usage contribution calendar, model analytics, and timeline trends for [DeepSeek Harness](https://github.com/deepseek-ai/dsh).

---

## Installation

Install with a single command via the official DSH CLI:

```bash
dsh plugin --profile web add token-contribution
```

*(To remove later: `dsh plugin --profile web remove token-contribution`)*

### Manual Alternative (pnpm)

```bash
cd ~/.dsh/profiles/web
pnpm add token-contribution
```
Then add `"token-contribution"` to `bundles` in `~/.dsh/profiles/web/package.json`.

---

## Preview

<p align="center">
  <img src="./assets/preview-overview.png?v=2" alt="Token Heatmap Overview" width="44%" />
  &nbsp;
  <img src="./assets/preview-trends.png?v=2" alt="Model Usage Breakdown & Trends" width="44%" />
</p>

---

## Features

- **52-Week GitHub Contribution Calendar:** 7 rows × 52 columns tracking daily token activity with a smooth monochromatic gradient anchored on DeepSeek's official brand blue (`#3964FE`).
- **Interactive Day Inspector:** Click on any day to slide open an inspection drawer showing every session active on that date, exact timestamps, and token breakdown.
- **Token types:** input, output, reasoning, cache read and cache write, shown for the whole history, each day, each session, each model and each provider. The headline total is input + output + cache read; reasoning is shown on its own because some providers count it inside output and others report it separately.
- **Provider breakdown:** usage grouped by provider (antigravity, claude, openrouter, …) alongside the per-model list.
- **Top Model Usage Breakdown:** tokens, share and requests for every model, with its provider and a per-type line.
- **Token Usage Trends Timeline:** daily bars stacked by token type, with **14D / 30D / 90D** ranges. Pick one type in the legend to chart it on its own scale (cache reads dwarf everything else).
- **Global & Per-Session Filtering:** Toggle between aggregate global history or inspect token activity for individual sessions.
- **Auto-Expanding Panel:** Smoothly widens the DSH Settings dialog to 1180px so the calendar and charts fit cleanly with zero scrollbars.
- **Session Token Meter Integration:** Injects a clean action button into the in-session token usage dialog to open the heatmap directly from active sessions.
- **Fast loading:** the first read of your session history streams every file through `zstd` (about 2.5 to 5 s for 200 MB of sessions, under 200 MB of memory). Results are cached in `~/.dsh/cache/token-contribution/sessions.json`, so later loads take about 20 ms, including after DSH restarts. A session that grows is read from where the last read stopped, not from the start.

---

## Usage

1. Open the DeepSeek Harness Web GUI (`http://127.0.0.1:3080`).
2. Open the account menu (bottom left) → **Settings** → **Token Contribution**.
3. Or during any session, click the token stats pill at the bottom of the composer and choose **View Token Contribution →**.

Requires Node 22.15+ (built-in zstd) and the `zstd` command for the fastest first load; without the command, files are decoded in-process.

## Development

```bash
npm test        # builds lib/, then runs the aggregator tests
npm run build   # bundles the host half (lib/index.js) and browser half (lib/client.js)
```

---

## License

MIT © [oiupoyt](https://git.oiupoyt.space/oiupoyt)
