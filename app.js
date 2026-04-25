// ─── State ────────────────────────────────────────────────────────────────────
let graphNodes = [];
let graphEdges = [];
let roundEvents = [];
let realRoundEvents = [];
let aiRoundEvents = [];
let activeDataSource = 'real';

const zoneToNode = {};
let nodeMap = {};
let graph = {};

const eventColors = { win: "#3fb950", loss: "#f85149" };

const eventShapes = {
  first_contact: d3.symbolCircle,
  first_kill: d3.symbolTriangle,
  trade: d3.symbolSquare,
  kill: d3.symbolDiamond,
  plant: d3.symbolStar,
  round_end: d3.symbolCross
};

const eventTypeColors = {
  first_contact: '#58a6ff',
  first_kill: '#f85149',
  trade: '#e3b341',
  kill: '#ff8c00',
  plant: '#3fb950',
  round_end: '#8957e5'
};

const EVENT_TYPES = ['first_contact','first_kill','trade','kill','plant','round_end'];

const ZONE_AREAS = {
  b: ['b_site','b_lane','b_main_out','b_main_in','b_main_orb','b_ticket','b_tiles','b_hut','attacker_b_spawn','defender_b_main'],
  a: ['a_site','heaven','heaven_glass','heaven_split','a_main','a_main_orb','tree','tree_split','gelato','defender_a_main'],
  mid: ['mid','mid_market','mid_double','mid_cubby','top_cat','top_mid'],
  spawn: ['defender_spawn','attacker_a_spawn','attacker_b_spawn']
};

const areaColors = { a: '#f85149', b: '#58a6ff', mid: '#e3b341', spawn: '#7d8590' };

const ZONE_SHORT = {
  defender_spawn: 'Def Spawn', defender_b_main: 'Def B', defender_a_main: 'Def A',
  attacker_b_spawn: 'Atk B', attacker_a_spawn: 'Atk A',
  b_site: 'B Site', b_lane: 'B Lane', b_main_out: 'B Out', b_main_in: 'B In',
  b_main_orb: 'B Orb', b_ticket: 'B Ticket', b_tiles: 'B Tiles', b_hut: 'B Hut',
  mid: 'Mid', mid_market: 'Market', mid_double: 'Double', mid_cubby: 'Cubby',
  top_cat: 'Cat', top_mid: 'Top Mid', gelato: 'Gelato',
  a_site: 'A Site', a_main: 'A Main', a_main_orb: 'A Orb',
  tree: 'Tree', tree_split: 'Split',
  heaven: 'Heaven', heaven_glass: 'Glass', heaven_split: 'Hv Split'
};

function formatZoneName(zone) {
  return ZONE_SHORT[zone] || zone.replace(/_/g, ' ');
}

const ROUND_DURATION_SEC = 100;
const PLAYBACK_STEP_SEC = 0.25;
const PLAYBACK_INTERVAL_MS = 40;

let selectedRound = 1;
let currentTime = 0;
let isPlaying = false;
let playTimer = null;
let highlightedEventKey = null;
let mapScale = 0.85;
let densityActiveTypes = new Set(EVENT_TYPES);

// ─── DOM References ────────────────────────────────────────────────────────────
const timelineSvg = d3.select("#timelineSvg");
const histogramSvg = d3.select("#histogramSvg");
const mapSvg = d3.select("#mapSvg");
const scrubberEventsSvg = d3.select("#scrubberEventsSvg");

const timeScrubber = document.getElementById("timeScrubber");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const roundSelect = document.getElementById("roundSelect");
const metricSelect = document.getElementById("metricSelect");
const outcomeFilter = document.getElementById("outcomeFilter");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevRoundBtn = document.getElementById("prevRoundBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const tooltip = document.getElementById("tooltip");
const toggleReal = document.getElementById("toggleReal");
const toggleAI = document.getElementById("toggleAI");

// ─── Utilities ─────────────────────────────────────────────────────────────────
function normalizeString(value) { return String(value ?? "").trim(); }

function normalizeOutcome(value) {
  const v = normalizeString(value).toLowerCase();
  if (v === "win") return "win";
  if (v === "loss" || v === "lose" || v === "lost") return "loss";
  return v;
}

function normalizeEventType(value) { return normalizeString(value).toLowerCase(); }

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function eventKey(d) {
  return `${d.round_id}|${d.timestamp_sec}|${d.event_type}|${d.player_id}|${d.source_zone}|${d.target_zone}`;
}

function getZoneArea(zoneName) {
  for (const [area, zones] of Object.entries(ZONE_AREAS)) {
    if (zones.includes(zoneName)) return area;
  }
  return 'spawn';
}

// ─── Graph / Pathfinding ───────────────────────────────────────────────────────
function buildGraph(nodes, edges) {
  const g = {};
  nodes.forEach(node => { g[node.id] = []; });
  edges.forEach(edge => {
    const a = edge.source, b = edge.target;
    if (!g[a]) g[a] = [];
    if (!g[b]) g[b] = [];
    g[a].push(b);
    g[b].push(a);
  });
  return g;
}

function findPath(start, end) {
  if (start === end) return [start];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const current = path[path.length - 1];
    if (current === end) return path;
    for (const neighbor of graph[current] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

// ─── Tooltip ───────────────────────────────────────────────────────────────────
function showTooltip(event, html) {
  tooltip.innerHTML = html;
  tooltip.classList.add("visible");
  moveTooltip(event);
}
function moveTooltip(event) {
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}
function hideTooltip() { tooltip.classList.remove("visible"); }

// ─── Zoom ──────────────────────────────────────────────────────────────────────
function applyMapZoom() { mapSvg.style("transform", `scale(${mapScale})`); }
function zoomIn() { mapScale = Math.min(1.6, mapScale + 0.08); applyMapZoom(); }
function zoomOut() { mapScale = Math.max(0.6, mapScale - 0.08); applyMapZoom(); }
function resetZoom() { mapScale = 1.1; applyMapZoom(); }

// ─── Data Filtering ────────────────────────────────────────────────────────────
function getFilteredEvents() {
  const outcome = outcomeFilter.value;
  return roundEvents.filter(d => outcome === "all" || d.outcome === outcome);
}

function getRoundsFromEvents(events) {
  return Array.from(new Set(events.map(d => d.round_id))).sort((a, b) => a - b);
}

function getAllRounds() {
  return Array.from(new Set(roundEvents.map(d => d.round_id))).sort((a, b) => a - b);
}

function getRoundMeta(roundId) {
  const rows = roundEvents.filter(d => d.round_id === roundId);
  if (!rows.length) return null;
  return { round_id: roundId, outcome: rows[0].outcome };
}

function getRoundEvents(roundId) {
  return roundEvents
    .filter(d => d.round_id === roundId)
    .sort((a, b) => a.timestamp_sec - b.timestamp_sec);
}

// ─── Data Source Toggle ────────────────────────────────────────────────────────
function switchDataSource(source) {
  activeDataSource = source;
  roundEvents = source === 'real' ? realRoundEvents : aiRoundEvents;

  toggleReal.classList.toggle('active', source === 'real');
  toggleAI.classList.toggle('active', source === 'ai');
  toggleAI.classList.toggle('ai-active', source === 'ai');

  const rounds = getAllRounds();
  selectedRound = rounds.length ? rounds[0] : 1;

  populateRoundSelect();
  updateRoundMeta();
  stopPlayback();
  setCurrentTime(0);
  updateStats();
  renderAll();
}

// ─── Round UI ──────────────────────────────────────────────────────────────────
function populateRoundSelect() {
  roundSelect.innerHTML = "";
  getAllRounds().forEach(roundId => {
    const option = document.createElement("option");
    option.value = roundId;
    option.textContent = `Round ${roundId}`;
    roundSelect.appendChild(option);
  });
  roundSelect.value = String(selectedRound);
}

function updateRoundMeta() {
  const meta = getRoundMeta(selectedRound);
  if (!meta) return;
  document.getElementById("selectedRoundTitle").textContent = `Round ${meta.round_id}`;
  const badge = document.getElementById("selectedRoundMeta");
  badge.textContent = meta.outcome === "win" ? "NRG Win" : "NRG Loss";
  badge.className = `round-outcome-badge ${meta.outcome}`;
}

function updateStats() {
  const filtered = getFilteredEvents();
  const rounds = getRoundsFromEvents(filtered);
  document.getElementById("roundCount").textContent = rounds.length;

  const avg = arr => arr.length ? Math.round(d3.mean(arr)) : "—";
  const firstContactTimes = filtered.filter(d => d.event_type === "first_contact").map(d => d.timestamp_sec);
  const firstKillTimes = filtered.filter(d => d.event_type === "first_kill").map(d => d.timestamp_sec);

  document.getElementById("avgFirstContact").textContent = `${avg(firstContactTimes)}s`;
  document.getElementById("avgFirstKill").textContent = `${avg(firstKillTimes)}s`;
}

// ─── Histogram ─────────────────────────────────────────────────────────────────
function renderHistogram() {
  const svgNode = histogramSvg.node();
  const style = window.getComputedStyle(svgNode);
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  const padT = parseFloat(style.paddingTop) || 0;
  const padB = parseFloat(style.paddingBottom) || 0;
  const width = (svgNode.clientWidth || 340) - padL - padR;
  const height = (svgNode.clientHeight || 180) - padT - padB;
  histogramSvg.selectAll("*").remove();

  const metric = metricSelect.value;
  const metricLabel = metricSelect.options[metricSelect.selectedIndex].text;
  const filtered = getFilteredEvents().filter(d => d.event_type === metric);
  const margin = { top: 14, right: 14, bottom: 38, left: 32 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const g = histogramSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const bins = d3.bin().domain([0, 100]).thresholds(d3.range(0, 100, 10));
  const winBins  = bins(filtered.filter(d => d.outcome === "win").map(d => d.timestamp_sec));
  const lossBins = bins(filtered.filter(d => d.outcome === "loss").map(d => d.timestamp_sec));

  const x = d3.scaleLinear().domain([0, 100]).range([0, iw]);
  const y = d3.scaleLinear()
    .domain([0, Math.max(1, d3.max([...winBins, ...lossBins], d => d.length))])
    .nice().range([ih, 0]);

  // Horizontal grid
  g.selectAll(".hgrid").data(y.ticks(4)).enter().append("line")
    .attr("x1", 0).attr("x2", iw)
    .attr("y1", d => y(d)).attr("y2", d => y(d))
    .attr("stroke", "#30363d").attr("stroke-width", 0.5);

  g.selectAll(".win-bar").data(winBins).enter().append("rect")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", d => ih - y(d.length))
    .attr("fill", eventColors.win).attr("opacity", 0.75).attr("rx", 2);

  g.selectAll(".loss-bar").data(lossBins).enter().append("rect")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", d => ih - y(d.length))
    .attr("fill", eventColors.loss).attr("opacity", 0.5).attr("rx", 2);

  // Axes
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickValues([0, 20, 40, 60, 80, 100]).tickFormat(d => `${d}s`));

  g.append("g").call(d3.axisLeft(y).ticks(4));

  // X-axis label showing selected metric
  g.append("text")
    .attr("x", iw / 2).attr("y", ih + margin.bottom - 4)
    .attr("text-anchor", "middle")
    .attr("fill", "#8b949e").attr("font-size", "10px")
    .text(metricLabel);

  // Invisible overlay rects for tooltips, one per bin
  winBins.forEach((wb, i) => {
    const lb = lossBins[i];
    g.append("rect")
      .attr("x", x(wb.x0)).attr("y", 0)
      .attr("width", Math.max(0, x(wb.x1) - x(wb.x0))).attr("height", ih)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("mouseover", (event) => {
        showTooltip(event,
          `<strong>${wb.x0}s – ${wb.x1}s</strong><br>` +
          `<span style="color:var(--win)">Win: ${wb.length}</span><br>` +
          `<span style="color:var(--loss)">Loss: ${lb.length}</span>`
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);
  });
}

// ─── Timeline ──────────────────────────────────────────────────────────────────
function renderTimeline() {
  const wrapper = document.querySelector(".timeline-scroll");
  const svgNode = timelineSvg.node();
  const width = (svgNode.getBoundingClientRect().width ||
    (wrapper ? wrapper.clientWidth - 12 : 0)) || 340;
  timelineSvg.selectAll("*").remove();

  const filtered = getFilteredEvents();
  const rounds = getRoundsFromEvents(filtered);
  const rowHeight = 28;
  const margin = { top: 10, right: 14, bottom: 24, left: 60 };
  const innerHeight = Math.max(rowHeight * rounds.length, rowHeight * 5);
  const totalHeight = innerHeight + margin.top + margin.bottom;
  const innerWidth = width - margin.left - margin.right;

  timelineSvg.attr("width", width).attr("height", totalHeight);

  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
  const y = d3.scaleBand().domain(rounds).range([0, innerHeight]).padding(0.38);
  const g = timelineSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Highlight selected round row
  g.append("rect")
    .attr("x", 0).attr("y", d => y(selectedRound) || 0)
    .attr("width", innerWidth)
    .attr("height", y.bandwidth() * 2.5)
    .attr("fill", "rgba(88,166,255,0.06)")
    .attr("rx", 3);

  g.selectAll(".round-line").data(rounds).enter().append("line")
    .attr("x1", 0).attr("x2", innerWidth)
    .attr("y1", d => y(d) + y.bandwidth() / 2).attr("y2", d => y(d) + y.bandwidth() / 2)
    .attr("stroke", d => d === selectedRound ? "#58a6ff" : "#30363d")
    .attr("stroke-width", d => d === selectedRound ? 1.5 : 1)
    .attr("stroke-dasharray", "4 4");

  g.selectAll(".round-label").data(rounds).enter().append("text")
    .attr("class", "timeline-round-label")
    .attr("x", -8).attr("y", d => y(d) + y.bandwidth() / 2 + 3)
    .attr("text-anchor", "end")
    .attr("fill", d => d === selectedRound ? "#58a6ff" : "#8b949e")
    .attr("font-weight", d => d === selectedRound ? "700" : "400")
    .text(d => `R${d}`);

  g.selectAll(".event-point").data(filtered).enter().append("path")
    .attr("class", "event-point")
    .attr("transform", d => `translate(${x(d.timestamp_sec)},${y(d.round_id) + y.bandwidth() / 2})`)
    .attr("d", d3.symbol().type(d => eventShapes[d.event_type] || d3.symbolCircle).size(48))
    .attr("fill", d => eventColors[d.outcome])
    .attr("stroke", d => eventKey(d) === highlightedEventKey ? "#fff" : "none")
    .attr("stroke-width", d => eventKey(d) === highlightedEventKey ? 2 : 0)
    .attr("opacity", d => {
      const rw = d.round_id === selectedRound ? 1 : 0.45;
      return d.timestamp_sec <= currentTime ? rw : rw * 0.2;
    })
    .on("mouseenter", function(event, d) {
      highlightedEventKey = eventKey(d);
      showTooltip(event, `<strong>${d.event_type.replace(/_/g," ")}</strong><br>${d.player_id || "—"}<br>${d.timestamp_sec}s`);
      // Update highlight strokes directly to avoid destroying elements before click fires
      d3.selectAll(".event-point")
        .attr("stroke", dd => eventKey(dd) === highlightedEventKey ? "#fff" : "none")
        .attr("stroke-width", dd => eventKey(dd) === highlightedEventKey ? 2 : 0);
      renderMap(); renderScrubberEvents();
    })
    .on("mousemove", function(event) { moveTooltip(event); })
    .on("mouseleave", function() {
      highlightedEventKey = null; hideTooltip();
      d3.selectAll(".event-point").attr("stroke", "none").attr("stroke-width", 0);
      renderMap(); renderScrubberEvents();
    })
    .on("click", (_, d) => {
      stopPlayback();
      selectedRound = d.round_id;
      roundSelect.value = String(selectedRound);
      updateRoundMeta();
      highlightedEventKey = eventKey(d);
      setCurrentTime(d.timestamp_sec);
      renderAll();
    });

  g.append("line").attr("class", "scrub-line")
    .attr("x1", x(currentTime)).attr("x2", x(currentTime))
    .attr("y1", 0).attr("y2", innerHeight);

  g.append("g").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}s`));
}

// ─── Scrubber Events ───────────────────────────────────────────────────────────
function renderScrubberEvents() {
  const events = getRoundEvents(selectedRound);
  const svgNode = scrubberEventsSvg.node();
  const width = svgNode.clientWidth || svgNode.parentElement.clientWidth || 300;
  const height = 28;
  scrubberEventsSvg.selectAll("*").remove();
  scrubberEventsSvg.attr("width", width).attr("height", height);

  const margin = { left: 8, right: 8 };
  const iw = width - margin.left - margin.right;
  const baseY = 14;
  const x = d3.scaleLinear().domain([0, 100]).range([0, iw]);
  const g = scrubberEventsSvg.append("g").attr("transform", `translate(${margin.left},0)`);

  g.append("line").attr("x1",0).attr("x2",iw).attr("y1",baseY).attr("y2",baseY)
    .attr("stroke","#30363d").attr("stroke-width",1);

  g.selectAll(".scrubber-event-point").data(events).enter().append("path")
    .attr("class", "scrubber-event-point")
    .attr("transform", d => `translate(${x(d.timestamp_sec)},${baseY})`)
    .attr("d", d3.symbol().type(d => eventShapes[d.event_type] || d3.symbolCircle).size(36))
    .attr("fill", d => eventColors[d.outcome])
    .attr("stroke", d => eventKey(d) === highlightedEventKey ? "#fff" : "none")
    .attr("stroke-width", d => eventKey(d) === highlightedEventKey ? 1.8 : 0)
    .on("mouseenter", function(event, d) {
      highlightedEventKey = eventKey(d);
      showTooltip(event, `<strong>${d.event_type.replace(/_/g," ")}</strong><br>${d.player_id || "—"}<br>${d.timestamp_sec}s`);
      d3.selectAll(".scrubber-event-point")
        .attr("stroke", dd => eventKey(dd) === highlightedEventKey ? "#fff" : "none")
        .attr("stroke-width", dd => eventKey(dd) === highlightedEventKey ? 1.8 : 0);
      renderTimeline(); renderMap();
    })
    .on("mousemove", function(event) { moveTooltip(event); })
    .on("mouseleave", function() {
      highlightedEventKey = null; hideTooltip();
      d3.selectAll(".scrubber-event-point").attr("stroke", "none").attr("stroke-width", 0);
      renderTimeline(); renderMap();
    })
    .on("click", (_, d) => {
      stopPlayback();
      highlightedEventKey = eventKey(d);
      setCurrentTime(d.timestamp_sec);
    });
}

// ─── Map Helpers ───────────────────────────────────────────────────────────────
function getPathPointsBetweenZones(fromZone, toZone) {
  const fromId = zoneToNode[fromZone], toId = zoneToNode[toZone];
  if (!fromId || !toId) return null;
  if (fromId === toId) {
    const node = nodeMap[fromId];
    return node ? [{ x: node.x, y: node.y }] : null;
  }
  const pathIds = findPath(fromId, toId);
  if (!pathIds) return null;
  return pathIds.map(id => nodeMap[id] ? { x: nodeMap[id].x, y: nodeMap[id].y } : null).filter(Boolean);
}

function buildPolylineMetrics(points) {
  if (!points || points.length < 2) return null;
  const segmentLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i+1].x - points[i].x;
    const dy = points[i+1].y - points[i].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    segmentLengths.push(len);
    totalLength += len;
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
      const a = polyline.points[i], b = polyline.points[i+1];
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
  const targetDist = polyline.totalLength * f;
  const points = [polyline.points[0]];
  let traversed = 0;
  for (let i = 0; i < polyline.segmentLengths.length; i++) {
    const segLen = polyline.segmentLengths[i];
    const a = polyline.points[i], b = polyline.points[i+1];
    if (traversed + segLen < targetDist) {
      points.push(b); traversed += segLen; continue;
    }
    const remaining = targetDist - traversed;
    const t = segLen === 0 ? 0 : remaining / segLen;
    points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    break;
  }
  return points;
}

function buildPlayerMovementSegments(roundId) {
  const events = getRoundEvents(roundId);
  const grouped = d3.group(events, d => d.player_id);
  const segments = [];
  grouped.forEach((playerEvents, playerId) => {
    const sorted = playerEvents.slice().sort((a, b) => a.timestamp_sec - b.timestamp_sec);
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromEvent = sorted[i], toEvent = sorted[i+1];
      if (toEvent.timestamp_sec <= fromEvent.timestamp_sec) continue;
      const pathPoints = getPathPointsBetweenZones(fromEvent.zone, toEvent.zone);
      const polyline = buildPolylineMetrics(pathPoints);
      if (!polyline) continue;
      segments.push({
        playerId, fromEvent, toEvent,
        startTime: fromEvent.timestamp_sec,
        endTime: toEvent.timestamp_sec,
        path: polyline
      });
    }
  });
  return { roundEvents: events, segments };
}

// ─── Map ───────────────────────────────────────────────────────────────────────
const EVENT_FADE_WINDOW_SEC = 15;
const PLAYER_OVERLAP_THRESHOLD = 14;
const PLAYER_OFFSET_RADIUS = 11;

function renderMap() {
  const svgEl = mapSvg.node();
  while (svgEl.children.length > 1) svgEl.removeChild(svgEl.lastChild);

  const gEdges = mapSvg.append("g");
  const gPaths = mapSvg.append("g");
  const gEventLinks = mapSvg.append("g");
  const gEventMarks = mapSvg.append("g");
  const gMarkers = mapSvg.append("g");

  gEdges.selectAll("line")
    .data(graphEdges.filter(d => nodeMap[d.source] && nodeMap[d.target]))
    .enter().append("line")
    .attr("class","graph-edge-debug")
    .attr("x1", d => nodeMap[d.source].x).attr("y1", d => nodeMap[d.source].y)
    .attr("x2", d => nodeMap[d.target].x).attr("y2", d => nodeMap[d.target].y);

  const movement = buildPlayerMovementSegments(selectedRound);
  const visibleEvents = movement.roundEvents.filter(d => d.timestamp_sec <= currentTime);
  const roundColor = eventColors[getRoundMeta(selectedRound)?.outcome || "win"];
  const lineBuilder = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveLinear);

  movement.segments.forEach(segment => {
    if (currentTime <= segment.startTime) return;
    const duration = segment.endTime - segment.startTime;
    const elapsed = Math.min(currentTime, segment.endTime) - segment.startTime;
    const fraction = duration <= 0 ? 1 : elapsed / duration;
    const partialPoints = getPartialPathPoints(segment.path, fraction);
    if (partialPoints.length < 2) return;
    gPaths.append("path")
      .attr("d", lineBuilder(partialPoints))
      .attr("fill", "none")
      .attr("stroke", roundColor)
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("opacity", 0.85)
      .attr("filter", "drop-shadow(0 0 3px " + roundColor + "66)");
  });

  const symGen = d3.symbol();
  visibleEvents.forEach(eventItem => {
    const age = currentTime - eventItem.timestamp_sec;
    const fadeOpacity = Math.max(0, 1 - age / EVENT_FADE_WINDOW_SEC);
    if (fadeOpacity < 0.02) return;

    // Marker goes at target (victim/effect location); fall back to zone then source
    const eventZoneId = zoneToNode[eventItem.target_zone] || zoneToNode[eventItem.zone] || zoneToNode[eventItem.source_zone];
    const eventPoint  = eventZoneId ? nodeMap[eventZoneId] : null;
    if (!eventPoint) return;

    const sourceId = zoneToNode[eventItem.source_zone];
    const targetId = zoneToNode[eventItem.target_zone];
    const sourcePoint = sourceId ? nodeMap[sourceId] : null;
    const targetPoint = targetId ? nodeMap[targetId] : null;
    const isHighlighted = eventKey(eventItem) === highlightedEventKey;
    const evColor = eventTypeColors[eventItem.event_type] || '#8b949e';

    // Thin dashed connector from source → target when zones differ
    if (sourcePoint && targetPoint && sourcePoint !== targetPoint) {
      gEventLinks.append("line")
        .attr("x1", sourcePoint.x).attr("y1", sourcePoint.y)
        .attr("x2", targetPoint.x).attr("y2", targetPoint.y)
        .attr("stroke", evColor)
        .attr("stroke-width", isHighlighted ? 2 : 1)
        .attr("stroke-dasharray", "4 3")
        .attr("opacity", fadeOpacity * 0.55)
        .on("mouseenter", function(event) {
          highlightedEventKey = eventKey(eventItem);
          showTooltip(event, `<strong>${eventItem.player_id || "—"}</strong><br>${eventItem.event_type.replace(/_/g," ")}<br>${formatZoneName(eventItem.source_zone)} → ${formatZoneName(eventItem.target_zone)}<br>${eventItem.timestamp_sec}s`);
          renderTimeline(); renderMap(); renderScrubberEvents();
        })
        .on("mousemove", function(event) { moveTooltip(event); })
        .on("mouseleave", function() { highlightedEventKey = null; hideTooltip(); renderTimeline(); renderMap(); renderScrubberEvents(); });
    }

    // D3 symbol shaped by event type, colored by event type
    const symPath = symGen
      .type(eventShapes[eventItem.event_type] || d3.symbolCircle)
      .size(isHighlighted ? 200 : 120)();

    gEventMarks.append("path")
      .attr("transform", `translate(${eventPoint.x},${eventPoint.y})`)
      .attr("d", symPath)
      .attr("fill", evColor)
      .attr("stroke", isHighlighted ? "#fff" : "rgba(0,0,0,0.5)")
      .attr("stroke-width", isHighlighted ? 2 : 0.8)
      .attr("opacity", fadeOpacity)
      .style("cursor", "pointer")
      .on("mouseenter", function(event) {
        highlightedEventKey = eventKey(eventItem);
        const src = eventItem.source_zone ? formatZoneName(eventItem.source_zone) : null;
        const tgt = eventItem.target_zone ? formatZoneName(eventItem.target_zone) : null;
        const zoneStr = src && tgt && src !== tgt ? `${src} → ${tgt}` : (src || formatZoneName(eventItem.zone));
        showTooltip(event, `<strong>${eventItem.player_id || "—"}</strong><br>${eventItem.event_type.replace(/_/g," ")}<br>${zoneStr}<br>${eventItem.timestamp_sec}s`);
        renderTimeline(); renderMap(); renderScrubberEvents();
      })
      .on("mousemove", function(event) { moveTooltip(event); })
      .on("mouseleave", function() { highlightedEventKey = null; hideTooltip(); renderTimeline(); renderMap(); renderScrubberEvents(); });
  });

  // First pass: compute all player positions
  const players = Array.from(new Set(movement.roundEvents.map(d => d.player_id))).sort();
  const playerMarkerData = [];

  players.forEach(playerId => {
    const playerEvents = movement.roundEvents.filter(d => d.player_id === playerId);
    if (!playerEvents.length) return;
    let markerPoint = null;

    const activeSegment = movement.segments.find(s =>
      s.playerId === playerId && currentTime >= s.startTime && currentTime <= s.endTime
    );

    if (activeSegment) {
      const duration = activeSegment.endTime - activeSegment.startTime;
      const progress = duration <= 0 ? 1 : (currentTime - activeSegment.startTime) / duration;
      markerPoint = getPointAtDistance(activeSegment.path, activeSegment.path.totalLength * progress);
    } else if (currentTime < playerEvents[0].timestamp_sec) {
      markerPoint = null; // don't show player before their first event
    } else {
      const pastEvents = playerEvents.filter(d => d.timestamp_sec <= currentTime);
      const lastEvent = pastEvents[pastEvents.length - 1];
      if (lastEvent) {
        const nodeId = zoneToNode[lastEvent.zone];
        markerPoint = nodeId ? nodeMap[nodeId] : null;
      }
    }

    if (markerPoint) playerMarkerData.push({ playerId, x: markerPoint.x, y: markerPoint.y });
  });

  // Second pass: apply radial offset when players share the same node
  playerMarkerData.forEach(pm => {
    const cluster = playerMarkerData.filter(other =>
      Math.hypot(other.x - pm.x, other.y - pm.y) < PLAYER_OVERLAP_THRESHOLD
    );
    if (cluster.length > 1) {
      const idx = cluster.indexOf(pm);
      const angle = (2 * Math.PI * idx) / cluster.length - Math.PI / 2;
      pm.drawX = pm.x + PLAYER_OFFSET_RADIUS * Math.cos(angle);
      pm.drawY = pm.y + PLAYER_OFFSET_RADIUS * Math.sin(angle);
    } else {
      pm.drawX = pm.x;
      pm.drawY = pm.y;
    }
  });

  // Render player markers with offsets applied
  playerMarkerData.forEach(({ playerId, drawX, drawY }) => {
    gMarkers.append("circle").attr("class","player-marker")
      .attr("cx", drawX).attr("cy", drawY)
      .attr("r", 6).attr("fill", roundColor)
      .attr("filter", "drop-shadow(0 0 4px " + roundColor + "99)")
      .on("mouseenter", function(event) {
        const lastPlayerEvent = movement.roundEvents
          .filter(d => d.player_id === playerId && d.timestamp_sec <= currentTime)
          .slice(-1)[0];
        const zone = lastPlayerEvent ? formatZoneName(lastPlayerEvent.zone) : "—";
        showTooltip(event, `<strong>${playerId}</strong><br>${zone}`);
      })
      .on("mousemove", function(event) { moveTooltip(event); })
      .on("mouseleave", function() { hideTooltip(); });
  });
}

// ─── Top Attack Flows (horizontal bar chart of source→target pairs) ────────────
function renderZoneFlow() {
  const el = document.getElementById("sankeyChartSvg");
  if (!el) return;
  const svg = d3.select(el);
  svg.selectAll("*").remove();

  const width  = el.clientWidth  || 340;
  const height = el.clientHeight || 220;

  const filtered = getFilteredEvents();
  const flowMap = new Map();
  filtered.forEach(d => {
    if (d.source_zone && d.target_zone && d.source_zone !== d.target_zone) {
      const key = `${d.source_zone}|||${d.target_zone}`;
      flowMap.set(key, (flowMap.get(key) || 0) + 1);
    }
  });

  if (flowMap.size === 0) {
    svg.append("text").attr("x", 14).attr("y", 30)
      .attr("fill", "#8b949e").attr("font-size", "12px")
      .text("No cross-zone events in filter");
    return;
  }

  const flowData = Array.from(flowMap.entries())
    .map(([key, count]) => {
      const [src, tgt] = key.split("|||");
      return { src, tgt, count, label: `${formatZoneName(src)} → ${formatZoneName(tgt)}` };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 9);

  const margin = { top: 10, right: 44, bottom: 24, left: 130 };
  const iw = width  - margin.left - margin.right;
  const ih = height - margin.top  - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(flowData, d => d.count)]).range([0, iw]).nice();
  const y = d3.scaleBand().domain(flowData.map(d => d.label)).range([0, ih]).padding(0.28);

  // Grid
  g.selectAll(".vgrid").data(x.ticks(4)).enter().append("line")
    .attr("x1", d => x(d)).attr("x2", d => x(d))
    .attr("y1", 0).attr("y2", ih)
    .attr("stroke", "#30363d").attr("stroke-width", 0.5);

  // Bars
  g.selectAll(".flow-bar").data(flowData).enter().append("rect")
    .attr("class", "flow-bar")
    .attr("x", 0).attr("y", d => y(d.label))
    .attr("width", d => x(d.count)).attr("height", y.bandwidth())
    .attr("fill", d => areaColors[getZoneArea(d.src)])
    .attr("opacity", 0.8).attr("rx", 3)
    .on("mouseenter", function(event, d) {
      d3.select(this).attr("opacity", 1);
      showTooltip(event,
        `<strong>${formatZoneName(d.src)} → ${formatZoneName(d.tgt)}</strong><br>` +
        `${d.count} event${d.count !== 1 ? 's' : ''}`);
    })
    .on("mousemove", function(event) { moveTooltip(event); })
    .on("mouseleave", function() { d3.select(this).attr("opacity", 0.8); hideTooltip(); });

  // Count label at end of bar
  g.selectAll(".flow-count").data(flowData).enter().append("text")
    .attr("x", d => x(d.count) + 5)
    .attr("y", d => y(d.label) + y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("font-size", "13px").attr("fill", "#8b949e")
    .text(d => d.count);

  // Y axis (zone pair labels)
  g.append("g").call(d3.axisLeft(y).tickSize(0).tickPadding(8))
    .call(ax => ax.select(".domain").remove())
    .selectAll("text").attr("font-size", "12px").attr("fill", "#e6edf3");

  // X axis
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d => d + "×"));
}

// ─── Event Density (Stacked Area + Brush) ─────────────────────────────────────
function renderEventDensity() {
  const el = document.getElementById("densityChartSvg");
  if (!el) return;
  const svg = d3.select(el);
  svg.selectAll("*").remove();

  const elStyle = window.getComputedStyle(el);
  const dPadL = parseFloat(elStyle.paddingLeft) || 0;
  const dPadR = parseFloat(elStyle.paddingRight) || 0;
  const dPadT = parseFloat(elStyle.paddingTop) || 0;
  const dPadB = parseFloat(elStyle.paddingBottom) || 0;
  const width  = (el.clientWidth  || 340) - dPadL - dPadR;
  const height = (el.clientHeight || 180) - dPadT - dPadB;
  const margin = { top: 12, right: 14, bottom: 38, left: 32 };
  const iw = width  - margin.left - margin.right;
  const ih = height - margin.top  - margin.bottom;
  const g  = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = getFilteredEvents();
  const activeTypes = EVENT_TYPES.filter(t => densityActiveTypes.has(t));
  const binW = 10;
  const binStarts = d3.range(0, 100, binW);

  const data = binStarts.map(start => {
    const row = { time: start };
    EVENT_TYPES.forEach(type => {
      row[type] = filtered.filter(d =>
        d.event_type === type && d.timestamp_sec >= start && d.timestamp_sec < start + binW
      ).length;
    });
    return row;
  });

  const layers = activeTypes.length ? d3.stack().keys(activeTypes)(data) : [];

  const x = d3.scaleLinear().domain([0, 100]).range([0, iw]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(layers, l => d3.max(l, d => d[1])) || 1])
    .nice().range([ih, 0]);

  const area = d3.area()
    .x(d => x(d.data.time + binW / 2))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.selectAll(".hgrid").data(y.ticks(4)).enter().append("line")
    .attr("x1", 0).attr("x2", iw)
    .attr("y1", d => y(d)).attr("y2", d => y(d))
    .attr("stroke", "#30363d").attr("stroke-width", 0.5);

  layers.forEach((layer, i) => {
    const type = activeTypes[i];
    g.append("path")
      .datum(layer).attr("d", area)
      .attr("fill", eventTypeColors[type]).attr("opacity", 0.82)
      .on("mouseenter", function(event) {
        d3.select(this).attr("opacity", 1);
        const total = filtered.filter(d => d.event_type === type).length;
        showTooltip(event, `<strong>${type.replace(/_/g, ' ')}</strong><br>${total} total`);
      })
      .on("mousemove", function(event) { moveTooltip(event); })
      .on("mouseleave", function() { d3.select(this).attr("opacity", 0.82); hideTooltip(); });
  });

  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickValues([0, 20, 40, 60, 80, 100]).tickFormat(d => `${d}s`));
  g.append("g").call(d3.axisLeft(y).ticks(4));

  g.append("text")
    .attr("x", iw / 2).attr("y", ih + margin.bottom - 4)
    .attr("text-anchor", "middle")
    .attr("fill", "#8b949e").attr("font-size", "10px")
    .text("Time (s)");

  // Brush for time-range selection
  const brush = d3.brushX()
    .extent([[0, 0], [iw, ih]])
    .on("brush", function(event) {
      if (!event.selection) return;
      const [s0, s1] = event.selection.map(d => x.invert(d));
      updateDensityLegend(filtered, [s0, s1]);
    })
    .on("end", function(event) {
      if (!event.selection) updateDensityLegend(filtered, null);
    });

  g.append("g").attr("class", "density-brush").call(brush);

  updateDensityLegend(filtered, null);
}

function updateDensityLegend(filtered, range) {
  const legendEl = document.getElementById("densityLegend");
  if (!legendEl) return;

  const rangeHeader = range
    ? `<div class="density-range-label">${Math.round(range[0])}s – ${Math.round(range[1])}s</div>`
    : '';

  legendEl.innerHTML = rangeHeader + EVENT_TYPES.map(type => {
    const isActive = densityActiveTypes.has(type);
    const count = range
      ? filtered.filter(d => d.event_type === type && d.timestamp_sec >= range[0] && d.timestamp_sec <= range[1]).length
      : filtered.filter(d => d.event_type === type).length;
    return `<label class="density-legend-item${isActive ? '' : ' inactive'}" data-type="${type}">
      <input type="checkbox" class="density-cb" data-type="${type}"${isActive ? ' checked' : ''}>
      <span class="density-legend-dot" style="background:${eventTypeColors[type]}"></span>
      <span class="density-legend-label">${type.replace(/_/g, ' ')}</span>
      <span class="density-legend-count">${count}</span>
    </label>`;
  }).join('');

  legendEl.querySelectorAll('.density-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const type = cb.dataset.type;
      if (cb.checked) densityActiveTypes.add(type);
      else densityActiveTypes.delete(type);
      renderEventDensity();
    });
  });
}

// ─── Hot Zones (Horizontal Bars) ──────────────────────────────────────────────
function renderZoneActivity() {
  const el = document.getElementById("zoneActivitySvg");
  if (!el) return;
  const svg = d3.select(el);
  svg.selectAll("*").remove();

  const width  = el.clientWidth  || 340;
  const height = el.clientHeight || 240;
  const margin = { top: 10, right: 46, bottom: 24, left: 76 };
  const iw = width  - margin.left - margin.right;
  const ih = height - margin.top  - margin.bottom;
  const g  = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = getFilteredEvents();
  const zoneWin  = new Map();
  const zoneLoss = new Map();
  filtered.forEach(d => {
    if (d.outcome === 'win') zoneWin.set(d.zone, (zoneWin.get(d.zone) || 0) + 1);
    else                     zoneLoss.set(d.zone, (zoneLoss.get(d.zone) || 0) + 1);
  });

  const allZones = new Set([...zoneWin.keys(), ...zoneLoss.keys()]);
  const zoneData = Array.from(allZones)
    .map(zone => ({
      zone,
      short: formatZoneName(zone),
      win:   zoneWin.get(zone)  || 0,
      loss:  zoneLoss.get(zone) || 0,
      total: (zoneWin.get(zone) || 0) + (zoneLoss.get(zone) || 0)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (zoneData.length === 0) {
    svg.append("text").attr("x", 14).attr("y", 30)
      .attr("fill", "#8b949e").attr("font-size", "12px").text("No data");
    return;
  }

  const y = d3.scaleBand().domain(zoneData.map(d => d.short)).range([0, ih]).padding(0.28);
  const x = d3.scaleLinear().domain([0, d3.max(zoneData, d => d.total)]).range([0, iw]).nice();

  // Grid
  g.selectAll(".vgrid").data(x.ticks(4)).enter().append("line")
    .attr("x1", d => x(d)).attr("x2", d => x(d))
    .attr("y1", 0).attr("y2", ih)
    .attr("stroke", "#30363d").attr("stroke-width", 0.5);

  // Win segment
  g.selectAll(".bar-win").data(zoneData).enter().append("rect")
    .attr("x", 0).attr("y", d => y(d.short))
    .attr("width", d => x(d.win)).attr("height", y.bandwidth())
    .attr("fill", eventColors.win).attr("opacity", 0.8).attr("rx", 3)
    .on("mouseenter", function(event, d) {
      showTooltip(event, `<strong>${d.short}</strong><br>Wins: ${d.win}  Losses: ${d.loss}`);
    })
    .on("mousemove", function(event) { moveTooltip(event); })
    .on("mouseleave", hideTooltip);

  // Loss segment (stacked)
  g.selectAll(".bar-loss").data(zoneData).enter().append("rect")
    .attr("x", d => x(d.win)).attr("y", d => y(d.short))
    .attr("width", d => x(d.loss)).attr("height", y.bandwidth())
    .attr("fill", eventColors.loss).attr("opacity", 0.7).attr("rx", 3)
    .on("mouseenter", function(event, d) {
      showTooltip(event, `<strong>${d.short}</strong><br>Wins: ${d.win}  Losses: ${d.loss}`);
    })
    .on("mousemove", function(event) { moveTooltip(event); })
    .on("mouseleave", hideTooltip);

  // Total count
  g.selectAll(".bar-total").data(zoneData).enter().append("text")
    .attr("x", d => x(d.total) + 5)
    .attr("y", d => y(d.short) + y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("font-size", "13px").attr("fill", "#8b949e")
    .text(d => d.total);

  // Area colour pip left of label
  g.selectAll(".zone-pip").data(zoneData).enter().append("circle")
    .attr("cx", -8).attr("cy", d => y(d.short) + y.bandwidth() / 2)
    .attr("r", 4).attr("fill", d => areaColors[getZoneArea(d.zone)]);

  // Y axis — use short names, 12px
  g.append("g")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(18))
    .call(ax => ax.select(".domain").remove())
    .selectAll("text").attr("font-size", "12px").attr("fill", "#e6edf3");

  // X axis
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(4));
}

// ─── Combat Outcomes ───────────────────────────────────────────────────────────
function renderOutcomeCorrelations() {
  const el = document.getElementById("correlationsSvg");
  if (!el) return;
  const svg = d3.select(el);
  svg.selectAll("*").remove();

  const width = el.clientWidth || 340;
  const totalH = 380;
  svg.attr("width", width).attr("height", totalH);

  const filtered = getFilteredEvents();
  const allRounds = getRoundsFromEvents(filtered);
  if (!allRounds.length) return;

  // ── First Kill Timing → Win Rate ───────────────────────────────────────────
  const fkM = { top: 28, right: 72, bottom: 36, left: 38 };
  const fkH = 148;
  const fkIW = width - fkM.left - fkM.right;
  const fkIH = fkH - fkM.top - fkM.bottom;
  const gFK = svg.append("g").attr("transform", `translate(${fkM.left},${fkM.top})`);

  gFK.append("text").attr("x", 0).attr("y", -12)
    .attr("font-size", "12px").attr("font-weight", "700").attr("fill", "#8b949e")
    .attr("letter-spacing", "0.06em").text("FIRST KILL TIMING → WIN RATE");

  const BUCKETS = [[0,10],[10,20],[20,30],[30,45],[45,60],[60,80],[80,100]];
  const fkData = BUCKETS.map(([lo, hi]) => {
    const rids = allRounds.filter(r => {
      const fk = filtered.find(d => d.round_id === r && d.event_type === 'first_kill');
      return fk && fk.timestamp_sec >= lo && fk.timestamp_sec < hi;
    });
    const wins = rids.filter(r => getRoundMeta(r)?.outcome === 'win').length;
    return { lo, hi, label: `${lo}-${hi}s`, n: rids.length, wins, wr: rids.length ? wins / rids.length : 0 };
  }).filter(d => d.n > 0);

  if (fkData.length) {
    const xFK = d3.scaleBand().domain(fkData.map(d => d.label)).range([0, fkIW]).padding(0.22);
    const yFK = d3.scaleLinear().domain([0, 1]).range([fkIH, 0]);
    const rateColor = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.2, 0.8]);

    [0.25, 0.5, 0.75].forEach(v => {
      gFK.append("line")
        .attr("x1", 0).attr("x2", fkIW).attr("y1", yFK(v)).attr("y2", yFK(v))
        .attr("stroke", v === 0.5 ? "#58a6ff" : "#30363d")
        .attr("stroke-dasharray", "4 3")
        .attr("stroke-width", v === 0.5 ? 1.5 : 0.5)
        .attr("opacity", v === 0.5 ? 0.7 : 1);
    });
    gFK.append("text").attr("x", fkIW + 4).attr("y", yFK(0.5) + 4)
      .attr("font-size", "11px").attr("fill", "#58a6ff").text("50%");

    gFK.selectAll(".fk-bar").data(fkData).enter().append("rect")
      .attr("x", d => xFK(d.label)).attr("y", d => yFK(d.wr))
      .attr("width", xFK.bandwidth()).attr("height", d => Math.max(2, fkIH - yFK(d.wr)))
      .attr("fill", d => rateColor(d.wr)).attr("rx", 3)
      .on("mouseenter", function(event, d) {
        showTooltip(event,
          `<strong>First Kill: ${d.label}</strong><br>Win rate: <strong>${Math.round(d.wr*100)}%</strong><br>${d.wins}W / ${d.n - d.wins}L (n=${d.n})`);
      })
      .on("mousemove", e => moveTooltip(e)).on("mouseleave", hideTooltip);

    gFK.append("g").attr("transform", `translate(0,${fkIH})`)
      .call(d3.axisBottom(xFK).tickSize(2))
      .selectAll("text").attr("font-size", "11px").attr("dy", "0.9em");
    gFK.append("g").call(d3.axisLeft(yFK).ticks(4).tickFormat(d => `${Math.round(d*100)}%`));
  }

  // ── Trade & Plant Impact ───────────────────────────────────────────────────
  const divY = fkH + 8;
  svg.append("line")
    .attr("x1", fkM.left).attr("x2", width - fkM.right)
    .attr("y1", divY).attr("y2", divY)
    .attr("stroke", "#30363d").attr("stroke-width", 1);

  const tiM = { top: 26, right: 72, bottom: 8, left: 82 };
  const tiY0 = divY + 2;
  const tiIW = width - tiM.left - tiM.right;
  const tiIH = totalH - tiY0 - tiM.top - tiM.bottom;
  const gTI = svg.append("g").attr("transform", `translate(${tiM.left},${tiY0 + tiM.top})`);

  gTI.append("text").attr("x", 0).attr("y", -12)
    .attr("font-size", "12px").attr("font-weight", "700").attr("fill", "#8b949e")
    .attr("letter-spacing", "0.06em").text("TRADE & PLANT → OUTCOME");

  const segments = [
    { label: '0 trades',  rids: allRounds.filter(r => !filtered.some(d => d.round_id === r && d.event_type === 'trade')) },
    { label: '1 trade',   rids: allRounds.filter(r => filtered.filter(d => d.round_id === r && d.event_type === 'trade').length === 1) },
    { label: '2+ trades', rids: allRounds.filter(r => filtered.filter(d => d.round_id === r && d.event_type === 'trade').length >= 2) },
    { label: 'Has plant', rids: allRounds.filter(r => filtered.some(d => d.round_id === r && d.event_type === 'plant')) },
    { label: 'No plant',  rids: allRounds.filter(r => !filtered.some(d => d.round_id === r && d.event_type === 'plant')) },
  ].map(s => {
    const wins = s.rids.filter(r => getRoundMeta(r)?.outcome === 'win').length;
    const n = s.rids.length;
    return { ...s, wins, losses: n - wins, n, wr: n ? wins / n : 0 };
  }).filter(s => s.n > 0);

  const yTI = d3.scaleBand().domain(segments.map(s => s.label)).range([0, tiIH]).padding(0.5);

  segments.forEach(s => {
    const barY = yTI(s.label);
    const bh = yTI.bandwidth();
    const winW = tiIW * s.wr;

    gTI.append("rect")
      .attr("x", 0).attr("y", barY).attr("width", winW).attr("height", bh)
      .attr("fill", eventColors.win).attr("opacity", 0.82).attr("rx", 3)
      .on("mouseenter", function(event) {
        showTooltip(event, `<strong>${s.label}</strong><br>Wins: ${s.wins} · Losses: ${s.losses}<br>Win rate: ${Math.round(s.wr*100)}%`);
      })
      .on("mousemove", e => moveTooltip(e)).on("mouseleave", hideTooltip);

    gTI.append("rect")
      .attr("x", winW).attr("y", barY).attr("width", tiIW - winW).attr("height", bh)
      .attr("fill", eventColors.loss).attr("opacity", 0.72).attr("rx", 3)
      .on("mouseenter", function(event) {
        showTooltip(event, `<strong>${s.label}</strong><br>Wins: ${s.wins} · Losses: ${s.losses}<br>Win rate: ${Math.round(s.wr*100)}%`);
      })
      .on("mousemove", e => moveTooltip(e)).on("mouseleave", hideTooltip);

    gTI.append("text")
      .attr("x", tiIW + 5).attr("y", barY + bh / 2).attr("dominant-baseline", "middle")
      .attr("font-size", "12px").attr("font-weight", "700")
      .attr("fill", s.wr > 0.5 ? eventColors.win : eventColors.loss)
      .text(`${Math.round(s.wr * 100)}%`);

    gTI.append("text")
      .attr("x", -6).attr("y", barY + bh / 2).attr("text-anchor", "end")
      .attr("dominant-baseline", "middle").attr("font-size", "12px").attr("fill", "#e6edf3")
      .text(s.label);

  });
}

// ─── Collapsible cards ─────────────────────────────────────────────────────────
function initCollapsibleCards() {
  document.querySelectorAll('.sidebar-card .card-header').forEach(header => {
    if (header.querySelector('.card-chevron')) return;
    const chev = document.createElement('span');
    chev.className = 'card-chevron';
    header.appendChild(chev);
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const card = header.closest('.sidebar-card');
      const isNowCollapsed = card.classList.toggle('collapsed');
      if (!isNowCollapsed) {
        setTimeout(() => {
          renderHistogram(); renderTimeline(); renderMap();
          renderScrubberEvents(); renderZoneFlow();
          renderEventDensity(); renderZoneActivity();
          renderOutcomeCorrelations();
        }, 16);
      }
    });
  });
}

// ─── Render All ────────────────────────────────────────────────────────────────
function renderAll() {
  renderHistogram();
  renderTimeline();
  renderMap();
  renderScrubberEvents();
  renderZoneFlow();
  renderEventDensity();
  renderZoneActivity();
  renderOutcomeCorrelations();
}

// ─── Playback ──────────────────────────────────────────────────────────────────
function setCurrentTime(value) {
  currentTime = Math.max(0, Math.min(100, +value));
  timeScrubber.value = currentTime;
  currentTimeLabel.textContent = `${currentTime.toFixed(1).replace(/\.0$/, "")}s`;
  renderTimeline();
  renderMap();
  renderScrubberEvents();
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;
  playPauseBtn.textContent = "⏸ Pause";
  playPauseBtn.className = "btn-pause";
  playTimer = setInterval(() => {
    if (currentTime >= 100) { stopPlayback(); return; }
    setCurrentTime(currentTime + PLAYBACK_STEP_SEC);
  }, PLAYBACK_INTERVAL_MS);
}

function stopPlayback() {
  isPlaying = false;
  playPauseBtn.textContent = "▶ Play";
  playPauseBtn.className = "btn-play";
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
}

// ─── Zone Maps ─────────────────────────────────────────────────────────────────
function buildZoneMaps() {
  graphNodes.forEach(node => { zoneToNode[node.id] = node.id; });
  nodeMap = Object.fromEntries(graphNodes.map(n => [n.id, n]));
  graph = buildGraph(graphNodes, graphEdges);
}

// ─── Data Loading ──────────────────────────────────────────────────────────────
function parseEvents(rawRows) {
  return rawRows
    .map(d => ({
      round_id: toNumber(d.round_id, NaN),
      outcome: normalizeOutcome(d.outcome),
      timestamp_sec: toNumber(d.timestamp_sec),
      event_type: normalizeEventType(d.event_type),
      zone: normalizeString(d.zone),
      source_zone: normalizeString(d.source_zone),
      target_zone: normalizeString(d.target_zone),
      player_id: normalizeString(d.player_id)
    }))
    .filter(d =>
      Number.isFinite(d.round_id) &&
      d.outcome &&
      Number.isFinite(d.timestamp_sec) &&
      d.event_type
    );
}

async function loadData() {
  const [nodesRaw, edgesRaw, dataRaw, aiRaw] = await Promise.all([
    d3.csv("nodes.csv"),
    d3.csv("edges.csv"),
    d3.csv("data.csv"),
    d3.csv("data_ai.csv").catch(() => [])
  ]);

  graphNodes = nodesRaw.map(d => ({
    id: normalizeString(d.id),
    x: toNumber(d.x),
    y: toNumber(d.y)
  }));

  graphEdges = edgesRaw.map(d => ({
    source: normalizeString(d.source),
    target: normalizeString(d.target)
  }));

  realRoundEvents = parseEvents(dataRaw);
  aiRoundEvents = parseEvents(aiRaw);
  roundEvents = realRoundEvents;

  buildZoneMaps();

  const rounds = getAllRounds();
  selectedRound = rounds.length ? rounds[0] : 1;

  populateRoundSelect();
  updateRoundMeta();
  updateStats();
  applyMapZoom();
  setCurrentTime(0);
  renderAll();
  initCollapsibleCards();
}

// ─── Event Handlers ────────────────────────────────────────────────────────────
toggleReal.addEventListener("click", () => switchDataSource('real'));
toggleAI.addEventListener("click", () => switchDataSource('ai'));

timeScrubber.addEventListener("input", e => {
  highlightedEventKey = null;
  setCurrentTime(e.target.value);
});

roundSelect.addEventListener("change", e => {
  selectedRound = +e.target.value;
  highlightedEventKey = null;
  updateRoundMeta();
  setCurrentTime(currentTime);
});

metricSelect.addEventListener("change", () => {
  renderHistogram();
  renderZoneFlow();
  renderZoneActivity();
});

outcomeFilter.addEventListener("change", () => {
  updateStats();
  renderHistogram();
  renderTimeline();
  renderZoneFlow();
  renderEventDensity();
  renderZoneActivity();
  renderOutcomeCorrelations();
});

playPauseBtn.addEventListener("click", () => { isPlaying ? stopPlayback() : startPlayback(); });

prevRoundBtn.addEventListener("click", () => {
  const rounds = getAllRounds();
  const index = rounds.indexOf(selectedRound);
  if (index > 0) {
    selectedRound = rounds[index - 1];
    roundSelect.value = String(selectedRound);
    highlightedEventKey = null;
    updateRoundMeta();
    setCurrentTime(currentTime);
  }
});

nextRoundBtn.addEventListener("click", () => {
  const rounds = getAllRounds();
  const index = rounds.indexOf(selectedRound);
  if (index < rounds.length - 1) {
    selectedRound = rounds[index + 1];
    roundSelect.value = String(selectedRound);
    highlightedEventKey = null;
    updateRoundMeta();
    setCurrentTime(currentTime);
  }
});

zoomInBtn.addEventListener("click", zoomIn);
zoomOutBtn.addEventListener("click", zoomOut);
zoomResetBtn.addEventListener("click", resetZoom);

// Rerender analytics on window resize
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderHistogram();
    renderZoneFlow();
    renderEventDensity();
    renderZoneActivity();
    renderOutcomeCorrelations();
  }, 150);
});

// ─── Boot ──────────────────────────────────────────────────────────────────────
loadData().catch(err => {
  console.error(err);
  alert("Failed to load CSV files. Open this app via a local server (e.g. python -m http.server 8080).");
});
