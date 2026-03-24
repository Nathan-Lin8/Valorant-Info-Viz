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

const ROUND_DURATION_SEC = 100;
const PLAYBACK_STEP_SEC = 0.25;
const PLAYBACK_INTERVAL_MS = 40;

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

function getRoundEvents(roundId) {
  return roundEvents
    .filter(d => d.round_id === roundId)
    .sort((a, b) => a.timestamp_sec - b.timestamp_sec);
}

function getPathPointsBetweenZones(fromZone, toZone) {
  const fromId = zoneToNode[fromZone];
  const toId   = zoneToNode[toZone];
  if (!fromId || !toId) return null;
  if (fromId === toId) {
    const node = nodeMap[fromId];
    return node ? [{ x: node.x, y: node.y }] : null;
  }

  const pathIds = findPath(fromId, toId);
  if (!pathIds) return null;

  return pathIds
    .map(id => nodeMap[id] ? { x: nodeMap[id].x, y: nodeMap[id].y } : null)
    .filter(Boolean);
}

function buildPolylineMetrics(points) {
  if (!points || points.length < 2) return null;

  const segmentLengths = [];
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segmentLen = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(segmentLen);
    totalLength += segmentLen;
  }

  if (totalLength <= 0) return null;

  return { points, segmentLengths, totalLength };
}

function getPointAtDistance(polyline, distance) {
  if (!polyline) return null;

  const clamped = Math.max(0, Math.min(distance, polyline.totalLength));
  let traversed = 0;

  for (let i = 0; i < polyline.segmentLengths.length; i++) {
    const segLen = polyline.segmentLengths[i];
    if (clamped <= traversed + segLen) {
      const t = segLen === 0 ? 0 : (clamped - traversed) / segLen;
      const a = polyline.points[i];
      const b = polyline.points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    traversed += segLen;
  }

  return polyline.points[polyline.points.length - 1];
}

function getPartialPathPoints(polyline, fraction) {
  if (!polyline) return [];
  const f = Math.max(0, Math.min(1, fraction));
  if (f <= 0) return [polyline.points[0]];
  if (f >= 1) return polyline.points.slice();

  const targetDistance = polyline.totalLength * f;
  const points = [polyline.points[0]];
  let traversed = 0;

  for (let i = 0; i < polyline.segmentLengths.length; i++) {
    const segLen = polyline.segmentLengths[i];
    const a = polyline.points[i];
    const b = polyline.points[i + 1];

    if (traversed + segLen < targetDistance) {
      points.push(b);
      traversed += segLen;
      continue;
    }

    const remaining = targetDistance - traversed;
    const t = segLen === 0 ? 0 : remaining / segLen;
    points.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    });
    break;
  }

  return points;
}

function buildPlayerMovementSegments(roundId) {
  const roundEvts = getRoundEvents(roundId);
  const byPlayer  = d3.group(roundEvts, d => d.player_id);
  const colorByPlayer = getPlayerColorMap(roundId);
  const segments = [];

  byPlayer.forEach((events, playerId) => {
    const sorted = events.slice().sort((a, b) => a.timestamp_sec - b.timestamp_sec);
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromEvent = sorted[i];
      const toEvent = sorted[i + 1];
      if (toEvent.timestamp_sec <= fromEvent.timestamp_sec) continue;

      const pathPoints = getPathPointsBetweenZones(fromEvent.zone, toEvent.zone);
      const pathMetrics = buildPolylineMetrics(pathPoints);
      if (!pathMetrics) continue;

      segments.push({
        playerId,
        color: colorByPlayer[playerId] || "#888",
        fromEvent,
        toEvent,
        startTime: fromEvent.timestamp_sec,
        endTime: toEvent.timestamp_sec,
        path: pathMetrics
      });
    }
  });

  return { roundEvents: roundEvts, segments, colorByPlayer };
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
    .attr("opacity", d => {
      const roundWeight = d.round_id === selectedRound ? 1 : 0.65;
      return d.timestamp_sec <= currentTime ? roundWeight : roundWeight * 0.25;
    })
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

  const gEdges  = mapSvg.append("g");
  const gPaths  = mapSvg.append("g");
  const gEvents = mapSvg.append("g");
  const gPlayerMarkers = mapSvg.append("g");

  // Faint graph edges for visual reference
  gEdges.selectAll("line").data(graphEdges).enter().append("line")
    .attr("class", "graph-edge-debug")
    .attr("x1", d => nodeMap[d[0]].x).attr("y1", d => nodeMap[d[0]].y)
    .attr("x2", d => nodeMap[d[1]].x).attr("y2", d => nodeMap[d[1]].y);

  const movement = buildPlayerMovementSegments(selectedRound);
  const visibleEvents = movement.roundEvents.filter(d => d.timestamp_sec <= currentTime);
  const lineBuilder = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveLinear);

  // Draw complete path segments and in-progress segment portion.
  movement.segments.forEach(segment => {
    if (currentTime <= segment.startTime) return;

    const segmentDuration = segment.endTime - segment.startTime;
    const elapsed = Math.min(currentTime, segment.endTime) - segment.startTime;
    const fraction = segmentDuration <= 0 ? 1 : elapsed / segmentDuration;
    const pathPoints = getPartialPathPoints(segment.path, fraction);
    if (pathPoints.length < 2) return;

    gPaths.append("path")
      .attr("d", lineBuilder(pathPoints))
      .attr("fill", "none")
      .attr("stroke", segment.color)
      .attr("stroke-width", 3.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("opacity", 0.85);
  });

  // Event dots snapped to node positions
  visibleEvents.forEach(d => {
    const nodeId = zoneToNode[d.zone];
    if (!nodeId || !nodeMap[nodeId]) return;
    const p = nodeMap[nodeId];
    if (!p) return;
    const color = movement.colorByPlayer[d.player_id] || eventColors[d.outcome];

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

  const players = Array.from(new Set(movement.roundEvents.map(d => d.player_id))).sort();
  players.forEach(playerId => {
    const playerEvents = movement.roundEvents.filter(d => d.player_id === playerId);
    if (!playerEvents.length) return;

    const color = movement.colorByPlayer[playerId] || "#888";
    let markerPoint = null;

    const activeSegment = movement.segments.find(
      segment =>
        segment.playerId === playerId &&
        currentTime >= segment.startTime &&
        currentTime <= segment.endTime
    );

    if (activeSegment) {
      const duration = activeSegment.endTime - activeSegment.startTime;
      const progress = duration <= 0 ? 1 : (currentTime - activeSegment.startTime) / duration;
      markerPoint = getPointAtDistance(activeSegment.path, activeSegment.path.totalLength * progress);
    } else if (currentTime < playerEvents[0].timestamp_sec) {
      const firstNode = zoneToNode[playerEvents[0].zone];
      markerPoint = firstNode ? nodeMap[firstNode] : null;
    } else {
      const pastEvents = playerEvents.filter(d => d.timestamp_sec <= currentTime);
      const lastEvent = pastEvents[pastEvents.length - 1];
      if (lastEvent) {
        const nodeId = zoneToNode[lastEvent.zone];
        markerPoint = nodeId ? nodeMap[nodeId] : null;
      }
    }

    if (!markerPoint) return;

    gPlayerMarkers.append("circle")
      .attr("cx", markerPoint.x)
      .attr("cy", markerPoint.y)
      .attr("r", 5.5)
      .attr("fill", color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.95);
  });
}

// ── Playback ──────────────────────────────────────────────────

function setCurrentTime(value) {
  currentTime = Math.max(0, Math.min(ROUND_DURATION_SEC, +value));
  timeScrubber.value = currentTime;
  currentTimeLabel.textContent = `${currentTime.toFixed(1).replace(/\.0$/, "")}s`;
  renderTimeline();
  renderMap();
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;
  playTimer = setInterval(() => {
    if (currentTime >= ROUND_DURATION_SEC) { stopPlayback(); return; }
    setCurrentTime(currentTime + PLAYBACK_STEP_SEC);
  }, PLAYBACK_INTERVAL_MS);
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
timeScrubber.max = String(ROUND_DURATION_SEC);
timeScrubber.step = "0.25";
updateRoundMeta();
updateStats();
renderHistogram();
renderTimeline();
renderMap();
setCurrentTime(0);
