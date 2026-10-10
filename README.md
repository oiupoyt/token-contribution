# dsh-plugin-token-heatmap

Visualizes your daily token consumption, prompt intensity, cache hit efficiency, and streaks across all sessions in a 52-week contribution calendar.

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

## Installation

### Method 1: Using pnpm in your DSH Web profile

Inside your DSH profile directory:

```bash
cd ~/.dsh/profiles/web
pnpm add dsh-plugin-token-heatmap
```

Then add `"dsh-plugin-token-heatmap"` to `~/.dsh/profiles/web/package.json` under `dsh.profile.bundles`:

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-plugin-token-heatmap"
      ]
    }
  }
}
```

### Method 2: Local Development Link

Clone the repository locally:

```bash
git clone https://github.com/oiupoyt/dsh-plugin-token-heatmap.git ~/projects/dsh-plugin-token-heatmap
cd ~/projects/dsh-plugin-token-heatmap
npm run build

cd ~/.dsh/profiles/web
pnpm add --link ~/projects/dsh-plugin-token-heatmap
```

---

## Usage

1. Open the DeepSeek Harness Web GUI (`http://127.0.0.1:3080`).
2. Go to **Settings** (gear icon at the bottom left) → **Token Heatmap**.
3. Or during any session, click on the token stats pill at the bottom of the composer to view token details and tap **"View 12-Month Activity Heatmap →"**.

---

## License

MIT © [oiupoyt](https://github.com/oiupoyt)
