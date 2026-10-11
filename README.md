# dsh-plugin-token-heatmap

Visualizes your daily token consumption, prompt intensity, cache hit efficiency, and streaks across all sessions in a 52-week contribution calendar.

---

## Installation

Install with a single command via the official DSH CLI (automatically downloads, registers, and activates the bundle in your web profile):

```bash
dsh plugin --profile web add dsh-token-heatmap
```

*(To remove later: `dsh plugin --profile web remove dsh-token-heatmap`)*


---

### Manual Alternative (pnpm)

```bash
cd ~/.dsh/profiles/web
pnpm add dsh-token-heatmap
```
Then add `"dsh-token-heatmap"` to `bundles` in `~/.dsh/profiles/web/package.json`.

---

## Features

- **52-Week GitHub Contribution Calendar:** 7 rows × 52 columns tracking daily token activity with 4-level color intensity.
- **Detailed Summary Cards:**
  - **Total Tokens:** Complete volume of input, output, and cached tokens.
  - **Cache Hit Ratio:** Percentage of tokens served from KV cache reads.
  - **Daily Average & Active Days:** Real workload metrics.
  - **Streak Tracker:** Current and longest active day streaks.
  - **Peak Day Callout:** Date and token count for your heaviest day.
- **Dual Color Palette:** Switch between **GitHub Emerald** and **DeepSeek Indigo**.
- **Interactive Tooltips:** Hover over any day to see token breakdown (billed input/output vs. cache reads and step counts).
- **Session Token Meter Integration:** Integrates into session stats pills with a *"View 12-Month Activity Heatmap"* button that opens the interactive modal dialog anywhere.
- **High-Performance Parser:** Aggregates zstandard (`.jsonl.zstd`) session logs with timestamp and mtime caching for near-instant rendering.
- **DeepSeek Native Theme:** Automatically adapts to DSH dark and light themes using `--dsw-alias-*` design tokens.

---

## Usage

1. Open the DeepSeek Harness Web GUI (`http://127.0.0.1:3080`).
2. Go to **Settings** (gear icon at the bottom left) → **Token Heatmap**.
3. Or during any session, click on the token stats pill at the bottom of the composer to view token details and tap **"View 12-Month Activity Heatmap →"**.

---

## License

MIT © [oiupoyt](https://github.com/oiupoyt)
