let graphNodes = [];
let graphEdges = [];
let roundEvents = [];

const zoneToNode = {};
let nodeMap = {};
let graph = {};

const eventColors = {
  win: "#1f6f50",
  loss: "#a33b3b"
};

const eventShapes = {
  first_contact: d3.symbolCircle,
  first_kill: d3.symbolTriangle,
  trade: d3.symbolSquare,
  kill: d3.symbolDiamond,
  plant: d3.symbolStar,
  round_end: d3.symbolCross
};

const ROUND_DURATION_SEC = 100;
const PLAYBACK_STEP_SEC = 0.25;
const PLAYBACK_INTERVAL_MS = 40;

let selectedRound = 1;
let currentTime = 0;
let isPlaying = false;
let playTimer = null;
let highlightedEventKey = null;
let mapScale = 0.75;

const timelineSvg = d3.select("#timelineSvg");
const histogramSvg = d3.select("#histogramSvg");
const mapSvg = d3.select("#mapSvg");
const scrubberEventsSvg = d3.select("#scrubberEventsSvg");

const timeScrubber = document.getElementById("timeScrubber");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const roundSelect = document.getElementById("roundSelect");
const metricSelect = document.getElementById("metricSelect");
const outcomeFilter = document.getElementById("outcomeFilter");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const prevRoundBtn = document.getElementById("prevRoundBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const tooltip = document.getElementById("tooltip");

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeOutcome(value) {
  const v = normalizeString(value).toLowerCase();
  if (v === "win") return "win";
  if (v === "loss" || v === "lose" || v === "lost") return "loss";
  return v;
}

function normalizeEventType(value) {
  return normalizeString(value).toLowerCase();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function eventKey(d) {
  return `${d.round_id}|${d.timestamp_sec}|${d.event_type}|${d.player_id}|${d.source_zone}|${d.target_zone}`;
}

function buildGraph(nodes, edges) {
  const g = {};
  nodes.forEach(node => {
    g[node.id] = [];
  });

  edges.forEach(edge => {
    const a = edge.source;
    const b = edge.target;
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

function showTooltip(event, html) {
  tooltip.innerHTML = html;
  tooltip.classList.add("visible");
  moveTooltip(event);
}

function moveTooltip(event) {
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

function hideTooltip() {
  tooltip.classList.remove("visible");
}

function applyMapZoom() {
  mapSvg.style("transform", `scale(${mapScale})`);
}

function zoomIn() {
  mapScale = Math.min(1.6, mapScale + 0.08);
  applyMapZoom();
}

function zoomOut() {
  mapScale = Math.max(0.6, mapScale - 0.08);
  applyMapZoom();
}

function resetZoom() {
  mapScale = 0.88;
  applyMapZoom();
}

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
  return {
    round_id: roundId,
    outcome: rows[0].outcome
  };
}

function getRoundEvents(roundId) {
  return roundEvents
    .filter(d => d.round_id === roundId)
    .sort((a, b) => a.timestamp_sec - b.timestamp_sec);
}

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
  document.getElementById("selectedRoundMeta").textContent =
    meta.outcome === "win" ? "NRG Win" : "NRG Loss";
}

function updateStats() {
  const filtered = getFilteredEvents();
  const rounds = getRoundsFromEvents(filtered);

  document.getElementById("roundCount").textContent = rounds.length;

  const firstContactTimes = filtered
    .filter(d => d.event_type === "first_contact")
    .map(d => d.timestamp_sec);

  const firstKillTimes = filtered
    .filter(d => d.event_type === "first_kill")
    .map(d => d.timestamp_sec);

  const avg = arr => arr.length ? Math.round(d3.mean(arr)) : 0;

  document.getElementById("avgFirstContact").textContent = `${avg(firstContactTimes)}s`;
  document.getElementById("avgFirstKill").textContent = `${avg(firstKillTimes)}s`;
}

function renderHistogram() {
  const svgNode = histogramSvg.node();
  const width = svgNode.clientWidth;
  const height = svgNode.clientHeight;
  histogramSvg.selectAll("*").remove();

  const metric = metricSelect.value;
  const filtered = getFilteredEvents().filter(d => d.event_type === metric);

  const margin = { top: 16, right: 16, bottom: 28, left: 34 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = histogramSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const bins = d3.bin()
    .domain([0, ROUND_DURATION_SEC])
    .thresholds([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

  const winBins = bins(filtered.filter(d => d.outcome === "win").map(d => d.timestamp_sec));
  const lossBins = bins(filtered.filter(d => d.outcome === "loss").map(d => d.timestamp_sec));

  const x = d3.scaleLinear()
    .domain([0, ROUND_DURATION_SEC])
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, Math.max(1, d3.max([...winBins, ...lossBins], d => d.length))])
    .nice()
    .range([innerHeight, 0]);

  g.selectAll(".win-bar")
    .data(winBins)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0) + 1.5)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 3))
    .attr("height", d => innerHeight - y(d.length))
    .attr("fill", eventColors.win)
    .attr("opacity", 0.55);

  g.selectAll(".loss-bar")
    .data(lossBins)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0) + 1.5)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 3))
    .attr("height", d => innerHeight - y(d.length))
    .attr("fill", eventColors.loss)
    .attr("opacity", 0.45);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}s`));

  g.append("g")
    .call(d3.axisLeft(y).ticks(4));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 24)
    .attr("text-anchor", "middle")
    .text("Time");
}

function renderTimeline() {
  const wrapper = document.querySelector(".timeline-wrap");
  const svgNode = timelineSvg.node();
  const width = svgNode.clientWidth || wrapper.clientWidth;

  timelineSvg.selectAll("*").remove();

  const filtered = getFilteredEvents();
  const rounds = getRoundsFromEvents(filtered);

  const rowHeight = 28;
  const margin = { top: 10, right: 14, bottom: 24, left: 56 };
  const visibleRows = 5;
  const innerHeight = Math.max(rowHeight * rounds.length, rowHeight * visibleRows);
  const totalHeight = innerHeight + margin.top + margin.bottom;
  const innerWidth = width - margin.left - margin.right;

  timelineSvg
    .attr("width", width)
    .attr("height", totalHeight);

  const x = d3.scaleLinear()
    .domain([0, ROUND_DURATION_SEC])
    .range([0, innerWidth]);

  const y = d3.scaleBand()
    .domain(rounds)
    .range([0, innerHeight])
    .padding(0.38);

  const g = timelineSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  g.selectAll(".round-line")
    .data(rounds)
    .enter()
    .append("line")
    .attr("x1", x(0))
    .attr("x2", x(ROUND_DURATION_SEC))
    .attr("y1", d => y(d) + y.bandwidth() / 2)
    .attr("y2", d => y(d) + y.bandwidth() / 2)
    .attr("stroke", "#9a9a9a")
    .attr("stroke-width", 1.1)
    .attr("stroke-dasharray", "4 4");

  g.selectAll(".round-label")
    .data(rounds)
    .enter()
    .append("text")
    .attr("class", "timeline-round-label")
    .attr("x", -8)
    .attr("y", d => y(d) + y.bandwidth() / 2 + 3)
    .attr("text-anchor", "end")
    .text(d => `Round ${d}`);

  g.selectAll(".event-point")
    .data(filtered)
    .enter()
    .append("path")
    .attr("class", "event-point")
    .attr("transform", d => `translate(${x(d.timestamp_sec)},${y(d.round_id) + y.bandwidth() / 2})`)
    .attr("d", d3.symbol().type(d => eventShapes[d.event_type] || d3.symbolCircle).size(42))
    .attr("fill", d => eventColors[d.outcome])
    .attr("stroke", d => eventKey(d) === highlightedEventKey ? "#111" : "none")
    .attr("stroke-width", d => eventKey(d) === highlightedEventKey ? 2.5 : 0)
    .attr("opacity", d => {
      const roundWeight = d.round_id === selectedRound ? 1 : 0.55;
      return d.timestamp_sec <= currentTime ? roundWeight : roundWeight * 0.25;
    })
    .on("mouseenter", function (event, d) {
      highlightedEventKey = eventKey(d);
      showTooltip(
        event,
        `<strong>${d.event_type.replace(/_/g, " ")}</strong><br>${d.player_id || "Unknown"}<br>${d.timestamp_sec}s`
      );
      renderTimeline();
      renderMap();
      renderScrubberEvents();
    })
    .on("mousemove", function (event) {
      moveTooltip(event);
    })
    .on("mouseleave", function () {
      highlightedEventKey = null;
      hideTooltip();
      renderTimeline();
      renderMap();
      renderScrubberEvents();
    })
    .on("click", (_, d) => {
      selectedRound = d.round_id;
      roundSelect.value = String(selectedRound);
      updateRoundMeta();
      highlightedEventKey = eventKey(d);
      setCurrentTime(d.timestamp_sec);
    });

  g.append("line")
    .attr("class", "scrub-line")
    .attr("x1", x(currentTime))
    .attr("x2", x(currentTime))
    .attr("y1", 0)
    .attr("y2", innerHeight);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}s`));
}

function renderScrubberEvents() {
  const events = getRoundEvents(selectedRound);
  const svgNode = scrubberEventsSvg.node();
  const width = svgNode.clientWidth || svgNode.parentElement.clientWidth;
  const height = 28;

  scrubberEventsSvg.selectAll("*").remove();
  scrubberEventsSvg.attr("width", width).attr("height", height);

  const margin = { left: 8, right: 8, top: 2, bottom: 2 };
  const innerWidth = width - margin.left - margin.right;
  const baselineY = 15;

  const x = d3.scaleLinear()
    .domain([0, ROUND_DURATION_SEC])
    .range([0, innerWidth]);

  const g = scrubberEventsSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", baselineY)
    .attr("y2", baselineY)
    .attr("stroke", "#bbb")
    .attr("stroke-width", 1);

  g.selectAll(".scrubber-event-point")
    .data(events)
    .enter()
    .append("path")
    .attr("class", "scrubber-event-point")
    .attr("transform", d => `translate(${x(d.timestamp_sec)},${baselineY})`)
    .attr("d", d3.symbol().type(d => eventShapes[d.event_type] || d3.symbolCircle).size(34))
    .attr("fill", d => eventColors[d.outcome])
    .attr("stroke", d => eventKey(d) === highlightedEventKey ? "#111" : "none")
    .attr("stroke-width", d => eventKey(d) === highlightedEventKey ? 2.2 : 0)
    .on("mouseenter", function (event, d) {
      highlightedEventKey = eventKey(d);
      showTooltip(
        event,
        `<strong>${d.event_type.replace(/_/g, " ")}</strong><br>${d.player_id || "Unknown"}<br>${d.timestamp_sec}s`
      );
      renderTimeline();
      renderMap();
      renderScrubberEvents();
    })
    .on("mousemove", function (event) {
      moveTooltip(event);
    })
    .on("mouseleave", function () {
      highlightedEventKey = null;
      hideTooltip();
      renderTimeline();
      renderMap();
      renderScrubberEvents();
    })
    .on("click", (_, d) => {
      highlightedEventKey = eventKey(d);
      setCurrentTime(d.timestamp_sec);
    });
}

function getPathPointsBetweenZones(fromZone, toZone) {
  const fromId = zoneToNode[fromZone];
  const toId = zoneToNode[toZone];

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
    const len = Math.sqrt(dx * dx + dy * dy);
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
      const a = polyline.points[i];
      const b = polyline.points[i + 1];
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
      };
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
  const events = getRoundEvents(roundId);
  const grouped = d3.group(events, d => d.player_id);
  const segments = [];

  grouped.forEach((playerEvents, playerId) => {
    const sorted = playerEvents.slice().sort((a, b) => a.timestamp_sec - b.timestamp_sec);

    for (let i = 0; i < sorted.length - 1; i++) {
      const fromEvent = sorted[i];
      const toEvent = sorted[i + 1];

      if (toEvent.timestamp_sec <= fromEvent.timestamp_sec) continue;

      const pathPoints = getPathPointsBetweenZones(fromEvent.zone, toEvent.zone);
      const polyline = buildPolylineMetrics(pathPoints);
      if (!polyline) continue;

      segments.push({
        playerId,
        fromEvent,
        toEvent,
        startTime: fromEvent.timestamp_sec,
        endTime: toEvent.timestamp_sec,
        path: polyline
      });
    }
  });

  return {
    roundEvents: events,
    segments
  };
}

function renderMap() {
  const svgEl = mapSvg.node();

  while (svgEl.children.length > 1) {
    svgEl.removeChild(svgEl.lastChild);
  }

  const gEdges = mapSvg.append("g");
  const gPaths = mapSvg.append("g");
  const gEventLinks = mapSvg.append("g");
  const gEventMarks = mapSvg.append("g");
  const gMarkers = mapSvg.append("g");

  gEdges.selectAll("line")
    .data(graphEdges.filter(d => nodeMap[d.source] && nodeMap[d.target]))
    .enter()
    .append("line")
    .attr("class", "graph-edge-debug")
    .attr("x1", d => nodeMap[d.source].x)
    .attr("y1", d => nodeMap[d.source].y)
    .attr("x2", d => nodeMap[d.target].x)
    .attr("y2", d => nodeMap[d.target].y);

  const movement = buildPlayerMovementSegments(selectedRound);
  const visibleEvents = movement.roundEvents.filter(d => d.timestamp_sec <= currentTime);
  const roundOutcome = getRoundMeta(selectedRound)?.outcome || "win";
  const roundColor = eventColors[roundOutcome];

  const lineBuilder = d3.line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveLinear);

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
      .attr("opacity", 0.8);
  });

  visibleEvents.forEach(eventItem => {
    const sourceId = zoneToNode[eventItem.source_zone];
    const targetId = zoneToNode[eventItem.target_zone];

    const sourcePoint = sourceId ? nodeMap[sourceId] : null;
    const targetPoint = targetId ? nodeMap[targetId] : null;

    if (sourcePoint && targetPoint) {
      gEventLinks.append("line")
        .attr("class", `map-link-line ${eventKey(eventItem) === highlightedEventKey ? "highlight-stroke" : ""}`)
        .attr("x1", sourcePoint.x)
        .attr("y1", sourcePoint.y)
        .attr("x2", targetPoint.x)
        .attr("y2", targetPoint.y)
        .attr("stroke", roundColor)
        .on("mouseenter", function (event) {
          highlightedEventKey = eventKey(eventItem);
          showTooltip(
            event,
            `<strong>${eventItem.player_id || "Unknown"}</strong><br>${eventItem.event_type.replace(/_/g, " ")}<br>${eventItem.timestamp_sec}s`
          );
          renderTimeline();
          renderMap();
          renderScrubberEvents();
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          highlightedEventKey = null;
          hideTooltip();
          renderTimeline();
          renderMap();
          renderScrubberEvents();
        });
    }

    if (sourcePoint) {
      gEventMarks.append("circle")
        .attr("cx", sourcePoint.x)
        .attr("cy", sourcePoint.y)
        .attr("r", 7)
        .attr("fill", roundColor)
        .attr("stroke", eventKey(eventItem) === highlightedEventKey ? "#111" : "#fff")
        .attr("stroke-width", eventKey(eventItem) === highlightedEventKey ? 3 : 2)
        .attr("opacity", 0.95)
        .on("mouseenter", function (event) {
          highlightedEventKey = eventKey(eventItem);
          showTooltip(
            event,
            `<strong>${eventItem.player_id || "Unknown"}</strong><br>${eventItem.event_type.replace(/_/g, " ")} source<br>${eventItem.source_zone}<br>${eventItem.timestamp_sec}s`
          );
          renderTimeline();
          renderMap();
          renderScrubberEvents();
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          highlightedEventKey = null;
          hideTooltip();
          renderTimeline();
          renderMap();
          renderScrubberEvents();
        });
    }

    if (targetPoint) {
      gEventMarks.append("text")
        .attr("class", "map-target-x")
        .attr("x", targetPoint.x)
        .attr("y", targetPoint.y)
        .attr("fill", roundColor)
        .style("stroke", eventKey(eventItem) === highlightedEventKey ? "#111" : "#fff")
        .style("stroke-width", eventKey(eventItem) === highlightedEventKey ? "3px" : "2px")
        .text("✕")
        .on("mouseenter", function (event) {
          highlightedEventKey = eventKey(eventItem);
          showTooltip(
            event,
            `<strong>${eventItem.player_id || "Unknown"}</strong><br>${eventItem.event_type.replace(/_/g, " ")} target<br>${eventItem.target_zone}<br>${eventItem.timestamp_sec}s`
          );
          renderTimeline();
          renderMap();
          renderScrubberEvents();
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          highlightedEventKey = null;
          hideTooltip();
          renderTimeline();
          renderMap();
          renderScrubberEvents();
        });
    }
  });

  const players = Array.from(new Set(movement.roundEvents.map(d => d.player_id))).sort();

  players.forEach(playerId => {
    const playerEvents = movement.roundEvents.filter(d => d.player_id === playerId);
    if (!playerEvents.length) return;

    let markerPoint = null;

    const activeSegment = movement.segments.find(segment =>
      segment.playerId === playerId &&
      currentTime >= segment.startTime &&
      currentTime <= segment.endTime
    );

    if (activeSegment) {
      const duration = activeSegment.endTime - activeSegment.startTime;
      const progress = duration <= 0 ? 1 : (currentTime - activeSegment.startTime) / duration;
      markerPoint = getPointAtDistance(activeSegment.path, activeSegment.path.totalLength * progress);
    } else if (currentTime < playerEvents[0].timestamp_sec) {
      const firstNodeId = zoneToNode[playerEvents[0].zone];
      markerPoint = firstNodeId ? nodeMap[firstNodeId] : null;
    } else {
      const pastEvents = playerEvents.filter(d => d.timestamp_sec <= currentTime);
      const lastEvent = pastEvents[pastEvents.length - 1];
      if (lastEvent) {
        const nodeId = zoneToNode[lastEvent.zone];
        markerPoint = nodeId ? nodeMap[nodeId] : null;
      }
    }

    if (!markerPoint) return;

    gMarkers.append("circle")
      .attr("class", "player-marker")
      .attr("cx", markerPoint.x)
      .attr("cy", markerPoint.y)
      .attr("r", 5.4)
      .attr("fill", roundColor);
  });
}

function setCurrentTime(value) {
  currentTime = Math.max(0, Math.min(ROUND_DURATION_SEC, +value));
  timeScrubber.value = currentTime;
  currentTimeLabel.textContent = `${currentTime.toFixed(1).replace(/\.0$/, "")}s`;
  renderTimeline();
  renderMap();
  renderScrubberEvents();
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;

  playTimer = setInterval(() => {
    if (currentTime >= ROUND_DURATION_SEC) {
      stopPlayback();
      return;
    }
    setCurrentTime(currentTime + PLAYBACK_STEP_SEC);
  }, PLAYBACK_INTERVAL_MS);
}

function stopPlayback() {
  isPlaying = false;
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
}

function buildZoneMaps() {
  graphNodes.forEach(node => {
    zoneToNode[node.id] = node.id;
  });
  nodeMap = Object.fromEntries(graphNodes.map(n => [n.id, n]));
  graph = buildGraph(graphNodes, graphEdges);
}

async function loadData() {
  const [nodesRaw, edgesRaw, dataRaw] = await Promise.all([
    d3.csv("nodes.csv"),
    d3.csv("edges.csv"),
    d3.csv("data.csv")
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

  roundEvents = dataRaw
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

  buildZoneMaps();

  const rounds = getAllRounds();
  selectedRound = rounds.length ? rounds[0] : 1;

  populateRoundSelect();
  updateRoundMeta();
  updateStats();
  renderHistogram();
  renderTimeline();
  renderMap();
  renderScrubberEvents();
  setCurrentTime(0);
  applyMapZoom();
}

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

metricSelect.addEventListener("change", renderHistogram);

outcomeFilter.addEventListener("change", () => {
  updateStats();
  renderHistogram();
  renderTimeline();
});

playBtn.addEventListener("click", startPlayback);
pauseBtn.addEventListener("click", stopPlayback);

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

loadData().catch(err => {
  console.error(err);
  alert("Failed to load CSV files. Make sure nodes.csv, edges.csv, and data.csv are in the same folder as index.html.");
});