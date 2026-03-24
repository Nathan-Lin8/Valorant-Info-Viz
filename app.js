const roundEvents = [
  { round_id: 1, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 18, event_type: "first_contact", zone: "mid" },
  { round_id: 1, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 25, event_type: "first_kill",    zone: "mid" },
  { round_id: 1, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 56, event_type: "plant",         zone: "a_site" },
  { round_id: 1, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 83, event_type: "round_end",     zone: "a_site" },

  { round_id: 2, player_id: "p1", side: "attack",  outcome: "loss", timestamp_sec: 12, event_type: "first_contact", zone: "b_main_in" },
  { round_id: 2, player_id: "p1", side: "attack",  outcome: "loss", timestamp_sec: 17, event_type: "first_kill",    zone: "b_main_in" },
  { round_id: 2, player_id: "p1", side: "attack",  outcome: "loss", timestamp_sec: 43, event_type: "plant",         zone: "b_site" },
  { round_id: 2, player_id: "p1", side: "attack",  outcome: "loss", timestamp_sec: 70, event_type: "round_end",     zone: "b_site" },

  { round_id: 3, player_id: "p3", side: "defense", outcome: "win",  timestamp_sec: 22, event_type: "first_contact", zone: "defender_a_main" },
  { round_id: 3, player_id: "p3", side: "defense", outcome: "win",  timestamp_sec: 28, event_type: "first_kill",    zone: "defender_a_main" },
  { round_id: 3, player_id: "p3", side: "defense", outcome: "win",  timestamp_sec: 62, event_type: "round_end",     zone: "a_site" },

  { round_id: 4, player_id: "p5", side: "defense", outcome: "loss", timestamp_sec: 16, event_type: "first_contact", zone: "mid" },
  { round_id: 4, player_id: "p5", side: "defense", outcome: "loss", timestamp_sec: 21, event_type: "first_kill",    zone: "mid" },
  { round_id: 4, player_id: "p5", side: "defense", outcome: "loss", timestamp_sec: 58, event_type: "round_end",     zone: "a_site" },

  { round_id: 5, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 30, event_type: "first_contact", zone: "a_main" },
  { round_id: 5, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 35, event_type: "first_kill",    zone: "a_main" },
  { round_id: 5, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 68, event_type: "plant",         zone: "a_site" },
  { round_id: 5, player_id: "p2", side: "attack",  outcome: "win",  timestamp_sec: 90, event_type: "round_end",     zone: "a_site" }
];

// ── Graph nodes ────────────────────────────────────────────────
// x/y coordinates are in Figma canvas space: 848 × 880.
// The map SVG uses viewBox="0 0 848 880" so these map 1:1 — no scaling needed.
const graphNodes = [
  { id: "defender_spawn",   x: 405, y: 122 },
  { id: "defender_b_main",  x: 245, y: 122 },
  { id: "b_hut",            x: 245, y: 240 },
  { id: "b_main_out",       x: 245, y: 296 },
  { id: "b_main_in",        x: 245, y: 339 },
  { id: "b_lane",           x: 96,  y: 296 },
  { id: "b_site",           x: 96,  y: 240 },
  { id: "b_main_orb",       x: 158, y: 339 },
  { id: "b_ticket",         x: 158, y: 450 },
  { id: "b_tiles",          x: 250, y: 450 },
  { id: "attacker_b_spawn", x: 250, y: 671 },
  { id: "mid_market",       x: 405, y: 240 },
  { id: "mid",              x: 405, y: 450 },
  { id: "attacker_a_spawn", x: 540, y: 671 },
  { id: "top_mid",          x: 540, y: 570 },
  { id: "top_cat",          x: 468, y: 570 },
  { id: "gelato",           x: 604, y: 570 },
  { id: "mid_double",       x: 468, y: 388 },
  { id: "mid_cubby",        x: 540, y: 388 },
  { id: "tree",             x: 542, y: 335 },
  { id: "heaven_glass",     x: 586, y: 197 },
  { id: "heaven_split",     x: 621, y: 197 },
  { id: "heaven",           x: 707, y: 197 },
  { id: "a_site",           x: 707, y: 333 },
  { id: "tree_split",       x: 540, y: 333 },
  { id: "a_main",           x: 707, y: 413 },
  { id: "a_main_orb",       x: 604, y: 413 },
  { id: "defender_a_main",  x: 621, y: 122 }
];

const graphEdges = [
  ["defender_spawn",   "defender_b_main"],
  ["defender_spawn",   "defender_a_main"],
  ["defender_b_main",  "b_hut"],
  ["b_hut",            "mid_market"],
  ["b_hut",            "b_main_out"],
  ["b_main_out",       "b_lane"],
  ["b_lane",           "b_site"],
  ["b_main_out",       "b_main_in"],
  ["b_main_in",        "b_main_orb"],
  ["b_main_orb",       "b_ticket"],
  ["b_ticket",         "b_tiles"],
  ["b_tiles",          "attacker_b_spawn"],
  ["attacker_b_spawn", "attacker_a_spawn"],
  ["b_tiles",          "mid"],
  ["defender_spawn",   "mid_market"],
  ["mid_market",       "mid"],
  ["mid",              "mid_double"],
  ["mid_double",       "top_cat"],
  ["top_cat",          "top_mid"],
  ["top_mid",          "gelato"],
  ["attacker_a_spawn", "top_mid"],
  ["gelato",           "a_main_orb"],
  ["a_main_orb",       "a_main"],
  ["a_main",           "a_site"],
  ["a_site",           "heaven"],
  ["a_site",           "tree_split"],
  ["tree_split",       "tree"],
  ["tree",             "mid_cubby"],
  ["mid_cubby",        "mid_double"],
  ["tree_split",       "heaven_glass"],
  ["heaven_glass",     "heaven_split"],
  ["heaven_split",     "heaven"],
  ["heaven_split",     "defender_a_spawn"]
];

const zoneToNode = {
  defender_spawn:   "defender_spawn",
  defender_b_main:  "defender_b_main",
  defender_a_main:  "defender_a_main",
  b_hut:            "b_hut",
  b_main_out:       "b_main_out",
  b_main_in:        "b_main_in",
  b_lane:           "b_lane",
  b_site:           "b_site",
  b_main_orb:       "b_main_orb",
  b_ticket:         "b_ticket",
  b_tiles:          "b_tiles",
  attacker_b_spawn: "attacker_b_spawn",
  attacker_a_spawn: "attacker_a_spawn",
  mid_market:       "mid_market",
  mid:              "mid",
  top_mid:          "top_mid",
  top_cat:          "top_cat",
  gelato:           "gelato",
  mid_double:       "mid_double",
  mid_cubby:        "mid_cubby",
  tree:             "tree",
  tree_split:       "tree_split",
  heaven_glass:     "heaven_glass",
  heaven_split:     "heaven_split",
  heaven:           "heaven",
  a_site:           "a_site",
  a_main:           "a_main",
  a_main_orb:       "a_main_orb"
};

const nodeMap = Object.fromEntries(graphNodes.map(n => [n.id, n]));

const eventColors = { win: "#1f6f50", loss: "#a33b3b" };

const playerColors = ["#e67e22", "#2980b9", "#8e44ad", "#27ae60", "#c0392b"];

const eventShapes = {
  first_contact: d3.symbolCircle,
  first_kill:    d3.symbolTriangle,
  plant:         d3.symbolSquare,
  round_end:     d3.symbolDiamond,
  death:         d3.symbolCross
};

let selectedRound = 1;
let currentTime   = 0;
let isPlaying     = false;
let playTimer     = null;

const timelineSvg  = d3.select("#timelineSvg");
const histogramSvg = d3.select("#histogramSvg");
const mapSvg       = d3.select("#mapSvg");

const timeScrubber     = document.getElementById("timeScrubber");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const roundSelect      = document.getElementById("roundSelect");
const metricSelect     = document.getElementById("metricSelect");
const sideFilter       = document.getElementById("sideFilter");
const outcomeFilter    = document.getElementById("outcomeFilter");
const playBtn          = document.getElementById("playBtn");
const pauseBtn         = document.getElementById("pauseBtn");
const prevRoundBtn     = document.getElementById("prevRoundBtn");
const nextRoundBtn     = document.getElementById("nextRoundBtn");

// ── Graph ─────────────────────────────────────────────────────

function buildGraph(nodes, edges) {
  const g = {};
  nodes.forEach(n => { g[n.id] = []; });
  edges.forEach(([a, b]) => { g[a].push(b); g[b].push(a); });
  return g;
}

const graph = buildGraph(graphNodes, graphEdges);

function findPath(start, end) {
  if (start === end) return [start];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const cur  = path[path.length - 1];
    if (cur === end) return path;
    for (const nb of (graph[cur] || [])) {
      if (!visited.has(nb)) { visited.add(nb); queue.push([...path, nb]); }
    }
  }
  return null;
}

// ── Filtering ─────────────────────────────────────────────────

function getFilteredEvents() {
  const sv = sideFilter.value;
  const ov = outcomeFilter.value;
  return roundEvents.filter(d =>
    (sv === "all" || d.side === sv) && (ov === "all" || d.outcome === ov)
  );
}

function getRoundsFromEvents(events) {
  return Array.from(new Set(events.map(d => d.round_id))).sort((a, b) => a - b);
}

function getAllRounds() {
  return Array.from(new Set(roundEvents.map(d => d.round_id))).sort((a, b) => a - b);
}

function getRoundMeta(id) {
  const rows = roundEvents.filter(d => d.round_id === id);
  return rows.length ? { round_id: id, side: rows[0].side, outcome: rows[0].outcome } : null;
}

function getPlayerColorMap(roundId) {
  const players = Array.from(new Set(
    roundEvents.filter(d => d.round_id === roundId).map(d => d.player_id)
  )).sort();
  const map = {};
  players.forEach((p, i) => { map[p] = playerColors[i % playerColors.length]; });
  return map;
}

// ── UI ────────────────────────────────────────────────────────

function populateRoundSelect() {
  roundSelect.innerHTML = "";
  getAllRounds().forEach(r => {
    const opt = document.createElement("option");
    opt.value = r; opt.textContent = `Round ${r}`;
    roundSelect.appendChild(opt);
  });
  roundSelect.value = selectedRound;
}

function updateRoundMeta() {
  const meta = getRoundMeta(selectedRound);
  if (!meta) return;
  document.getElementById("selectedRoundTitle").textContent = `Round ${meta.round_id}`;
  document.getElementById("selectedRoundMeta").textContent =
    `${meta.side[0].toUpperCase() + meta.side.slice(1)} • ${meta.outcome[0].toUpperCase() + meta.outcome.slice(1)}`;
}

function updateStats() {
  const f = getFilteredEvents();
  document.getElementById("roundCount").textContent = getRoundsFromEvents(f).length;
  const avg = arr => arr.length ? Math.round(d3.mean(arr)) : 0;
  document.getElementById("avgFirstContact").textContent =
    `${avg(f.filter(d => d.event_type === "first_contact").map(d => d.timestamp_sec))}s`;
  document.getElementById("avgFirstKill").textContent =
    `${avg(f.filter(d => d.event_type === "first_kill").map(d => d.timestamp_sec))}s`;
}

// ── Timeline ──────────────────────────────────────────────────

function renderTimeline() {
  const el    = timelineSvg.node();
  const W     = el.clientWidth;
  const H     = el.clientHeight;
  timelineSvg.selectAll("*").remove();

  const filtered = getFilteredEvents();
  const rounds   = getRoundsFromEvents(filtered);
  const m        = { top: 20, right: 24, bottom: 30, left: 80 };
  const iW = W - m.left - m.right;
  const iH = H - m.top  - m.bottom;

  const x = d3.scaleLinear().domain([0, 100]).range([0, iW]);
  const y = d3.scaleBand().domain(rounds).range([0, iH]).padding(0.35);
  const g = timelineSvg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  g.selectAll(".rl").data(rounds).enter().append("line")
    .attr("x1", x(0)).attr("x2", x(100))
    .attr("y1", d => y(d) + y.bandwidth() / 2).attr("y2", d => y(d) + y.bandwidth() / 2)
    .attr("stroke", "#9a9a9a").attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4");

  g.selectAll(".lbl").data(rounds).enter().append("text")
    .attr("class", "timeline-round-label")
    .attr("x", -12).attr("y", d => y(d) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end").text(d => `Round ${d}`);

  g.selectAll(".event-point").data(filtered).enter().append("path")
    .attr("class", d => `event-point round-${d.round_id}`)
    .attr("transform", d => `translate(${x(d.timestamp_sec)},${y(d.round_id) + y.bandwidth() / 2})`)
    .attr("d", d3.symbol().type(d => eventShapes[d.event_type] || d3.symbolCircle).size(85))
    .attr("fill", d => eventColors[d.outcome])
    .attr("opacity", d => d.round_id === selectedRound ? 1 : 0.55)
    .on("click", (_, d) => {
      selectedRound = d.round_id;
      roundSelect.value = String(selectedRound);
      updateRoundMeta(); renderTimeline(); renderMap();
    });

  g.append("line").attr("class", "scrub-line")
    .attr("x1", x(currentTime)).attr("x2", x(currentTime))
    .attr("y1", 0).attr("y2", iH);

  g.append("g").attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}s`));
}

// ── Histogram ─────────────────────────────────────────────────

function renderHistogram() {
  const el  = histogramSvg.node();
  const W   = el.clientWidth;
  const H   = el.clientHeight;
  histogramSvg.selectAll("*").remove();

  const metric   = metricSelect.value;
  const filtered = getFilteredEvents().filter(d => d.event_type === metric);
  const m        = { top: 20, right: 20, bottom: 36, left: 42 };
  const iW = W - m.left - m.right;
  const iH = H - m.top  - m.bottom;
  const g  = histogramSvg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const bins    = d3.bin().domain([0, 100]).thresholds([0,10,20,30,40,50,60,70,80,90,100]);
  const winBins = bins(filtered.filter(d => d.outcome === "win").map(d => d.timestamp_sec));
  const lossBins= bins(filtered.filter(d => d.outcome === "loss").map(d => d.timestamp_sec));

  const x = d3.scaleLinear().domain([0, 100]).range([0, iW]);
  const y = d3.scaleLinear()
    .domain([0, Math.max(1, d3.max([...winBins, ...lossBins], d => d.length))])
    .nice().range([iH, 0]);

  g.selectAll(".wb").data(winBins).enter().append("rect")
    .attr("x", d => x(d.x0) + 2).attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 4))
    .attr("height", d => iH - y(d.length))
    .attr("fill", eventColors.win).attr("opacity", 0.6);

  g.selectAll(".lb").data(lossBins).enter().append("rect")
    .attr("x", d => x(d.x0) + 2).attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 4))
    .attr("height", d => iH - y(d.length))
    .attr("fill", eventColors.loss).attr("opacity", 0.45);

  g.append("g").attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}s`));
  g.append("g").call(d3.axisLeft(y).ticks(4));
  g.append("text").attr("class", "axis-label")
    .attr("x", iW / 2).attr("y", iH + 30).attr("text-anchor", "middle").text("Time in Round");
  g.append("text").attr("class", "axis-label").attr("x", 0).attr("y", -6).text("Count");
}

// ── Map ───────────────────────────────────────────────────────
// #mapSvg has viewBox="0 0 848 880" with the Ascent <image> as its first child.
// Node x/y are in that same 848×880 Figma space — no scaling transform needed.

function renderMap() {
  const svgEl = mapSvg.node();
  // Preserve the background <image> (first child), remove everything else
  while (svgEl.children.length > 1) svgEl.removeChild(svgEl.lastChild);

  const pos = id => nodeMap[id] ? { x: nodeMap[id].x, y: nodeMap[id].y } : null;

  const gEdges  = mapSvg.append("g");
  const gPaths  = mapSvg.append("g");
  const gEvents = mapSvg.append("g");

  // Faint graph edges for visual reference
  gEdges.selectAll("line").data(graphEdges).enter().append("line")
    .attr("class", "graph-edge-debug")
    .attr("x1", d => nodeMap[d[0]].x).attr("y1", d => nodeMap[d[0]].y)
    .attr("x2", d => nodeMap[d[1]].x).attr("y2", d => nodeMap[d[1]].y);

  const roundEvts = roundEvents
    .filter(d => d.round_id === selectedRound)
    .sort((a, b) => a.timestamp_sec - b.timestamp_sec);

  const visible        = roundEvts.filter(d => d.timestamp_sec <= currentTime);
  const playerColorMap = getPlayerColorMap(selectedRound);

  // Per-player paths between consecutive events of the same player
  d3.group(visible, d => d.player_id).forEach((events, pid) => {
    const color  = playerColorMap[pid] || "#888";
    const sorted = events.slice().sort((a, b) => a.timestamp_sec - b.timestamp_sec);

    for (let i = 0; i < sorted.length - 1; i++) {
      const fromId = zoneToNode[sorted[i].zone];
      const toId   = zoneToNode[sorted[i + 1].zone];
      if (!fromId || !toId || fromId === toId) continue;

      const pathIds = findPath(fromId, toId);
      if (!pathIds) continue;

      const pts = pathIds.map(id => pos(id)).filter(Boolean);
      if (pts.length < 2) continue;

      gPaths.append("path")
        .attr("d", d3.line().x(d => d.x).y(d => d.y)(pts))
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("opacity", 0.75);
    }
  });

  // Event dots snapped to node positions
  visible.forEach(d => {
    const nodeId = zoneToNode[d.zone];
    if (!nodeId) return;
    const p = pos(nodeId);
    if (!p) return;
    const color = playerColorMap[d.player_id] || eventColors[d.outcome];

    gEvents.append("circle")
      .attr("cx", p.x).attr("cy", p.y).attr("r", 8)
      .attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("opacity", 0.92);

    gEvents.append("text")
      .attr("x", p.x).attr("y", p.y - 13)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px").attr("fill", "#111").attr("font-weight", "700")
      .text(d.event_type.replace(/_/g, " "));
  });
}

// ── Playback ──────────────────────────────────────────────────

function setCurrentTime(value) {
  currentTime = +value;
  timeScrubber.value = currentTime;
  currentTimeLabel.textContent = `${currentTime}s`;
  renderTimeline();
  renderMap();
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;
  playTimer = setInterval(() => {
    if (currentTime >= 100) { stopPlayback(); return; }
    setCurrentTime(currentTime + 1);
  }, 120);
}

function stopPlayback() {
  isPlaying = false;
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
}

// ── Listeners ─────────────────────────────────────────────────

timeScrubber.addEventListener("input", e => setCurrentTime(e.target.value));

roundSelect.addEventListener("change", e => {
  selectedRound = +e.target.value;
  updateRoundMeta(); renderTimeline(); renderMap();
});

metricSelect.addEventListener("change", renderHistogram);
sideFilter.addEventListener("change",    () => { updateStats(); renderHistogram(); renderTimeline(); });
outcomeFilter.addEventListener("change", () => { updateStats(); renderHistogram(); renderTimeline(); });
playBtn.addEventListener("click",  startPlayback);
pauseBtn.addEventListener("click", stopPlayback);

prevRoundBtn.addEventListener("click", () => {
  const rounds = getAllRounds();
  const i = rounds.indexOf(selectedRound);
  if (i > 0) {
    selectedRound = rounds[i - 1];
    roundSelect.value = String(selectedRound);
    updateRoundMeta(); renderTimeline(); renderMap();
  }
});

nextRoundBtn.addEventListener("click", () => {
  const rounds = getAllRounds();
  const i = rounds.indexOf(selectedRound);
  if (i < rounds.length - 1) {
    selectedRound = rounds[i + 1];
    roundSelect.value = String(selectedRound);
    updateRoundMeta(); renderTimeline(); renderMap();
  }
});

// ── Init ──────────────────────────────────────────────────────

populateRoundSelect();
updateRoundMeta();
updateStats();
renderHistogram();
renderTimeline();
renderMap();
setCurrentTime(0);
