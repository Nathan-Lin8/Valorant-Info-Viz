# Valorant Round Analysis

Interactive round-by-round breakdown of a Valorant match on Ascent. Built with D3.js v7, no build step.

## Running it

Open `index.html` with the VS Code [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension. Right-click → **Open with Live Server** → `http://127.0.0.1:5500`.

## Files

| File | What it is |
|---|---|
| `data.csv` | Real match events — round ID, outcome, timestamp, event type, zone, source/target zones, player ID |
| `data_ai.csv` | AI-generated events with the same schema, for comparison |
| `nodes.csv` | Ascent zone IDs with pixel coordinates |
| `edges.csv` | Zone adjacency list used by the BFS pathfinder |

## What you can do

**Switch data sources** — toggle Real / AI Generated in the top bar to compare pro-play patterns against synthetic data side by side.

**Filter** — the Outcome and Metric dropdowns let you slice by win/loss and event type (first contact, kill, trade, plant, etc.).

**Browse and play rounds** — jump between rounds with the dropdown or arrows, or hit Play to watch events animate across the map in real time. The scrubber is draggable.

**Zoom the map** — +/−/reset buttons let you pan around for a closer look at event positions.

**Click timeline events** — clicking any marker in the Round Timeline snaps the scrubber to that moment and highlights the corresponding map pin.

**Hover for details** — tooltips on map markers, timeline events, histogram bars, and zone charts show zone name, event type, timestamp, and player.

## What's worth noting

**Paths follow map geometry.** Player movement runs BFS over the real zone connectivity graph (`edges.csv`) to find the shortest walkable path between events, then animates a polyline along it — no straight-line shortcuts.

**Five synchronized views.** Map, scrubber, histogram, timeline, and analytics all share a single state. Changing the round or scrubbing time updates everything at once.

**Analytics panel includes:**
- *Top Attack Flows* — common source → target zone pairs
- *Event Pulse* — kernel-smoothed frequency curves by round time, one line per event type, toggleable from the legend
- *Combat Outcomes* — first-kill timing scatter colored by win/loss, with trade and plant effects
- *Hot Zones* — event counts per zone, color-coded by map area (A site, B site, Mid, Spawn) shows where the most activity occurred that game