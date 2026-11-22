function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function renderKpiBar(pathResult) {
  const pathEl = document.getElementById("kpi-path");
  const costEl = document.getElementById("kpi-cost");
  const delayEl = document.getElementById("kpi-delay");
  const bwEl = document.getElementById("kpi-bw");

  if (!pathResult.reachable) {
    pathEl.textContent = "UNREACHABLE (Network Partitioned)";
    pathEl.classList.add("unreachable");
    costEl.textContent = "∞";
    delayEl.textContent = "∞";
    bwEl.textContent = "0 Mbps";
    return;
  }

  pathEl.classList.remove("unreachable");
  pathEl.textContent = pathResult.pathNodes.join(" → ");
  costEl.textContent = String(pathResult.totalCost);
  delayEl.textContent = `${pathResult.totalDelay} ms`;
  bwEl.textContent = pathResult.bottleneckBw === Infinity ? "Local" : `${pathResult.bottleneckBw} Mbps`;
}

function renderTopology(state, pathResult, onToggleLink, onSelectRouter) {
  const svg = document.getElementById("topology-svg");
  svg.innerHTML = "";

  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const activeSet = new Set(pathResult.pathLinks);
  const isCongestedWarning =
    state.mode === "ospf" &&
    state.jaiMumDelay > 50 &&
    activeSet.has("L3") &&
    !state.overrideJaiMumCost;

  const banner = document.getElementById("congestion-banner");
  if (isCongestedWarning) {
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  // Draw WAN links first
  state.links.forEach((link) => {
    const u = nodeMap[link.u];
    const v = nodeMap[link.v];
    const g = createSvgElement("g", { class: "link-group", "data-link-id": link.id });

    const hit = createSvgElement("line", {
      x1: u.x, y1: u.y, x2: v.x, y2: v.y,
      class: "link-hitarea"
    });

    let lineClass = "link-line";
    let badgeClass = "link-badge-bg";
    if (!link.isUp) {
      lineClass += " failed";
      badgeClass += " failed";
    } else if (link.id === "L3" && state.jaiMumDelay > 50 && activeSet.has("L3")) {
      lineClass += " congested";
      badgeClass += " congested";
    } else if (activeSet.has(link.id)) {
      lineClass += " active";
    }

    const line = createSvgElement("line", {
      x1: u.x, y1: u.y, x2: v.x, y2: v.y,
      class: lineClass
    });

    g.appendChild(hit);
    g.appendChild(line);

    if (!link.isUp) {
      const midX = (u.x + v.x) / 2;
      const midY = (u.y + v.y) / 2;
      const xMark = createSvgElement("text", { x: midX, y: midY, class: "fail-marker" });
      xMark.textContent = "✕";
      g.appendChild(xMark);
    }

    const effCost = getEffectiveCost(link, state);
    const effDelay = getEffectiveDelay(link, state);
    const lx = link.labelPos.x;
    const ly = link.labelPos.y;

    const rect = createSvgElement("rect", {
      x: lx - 58, y: ly - 24, width: 116, height: 48, rx: 6,
      class: badgeClass
    });
    const t1 = createSvgElement("text", { x: lx, y: ly - 7, class: "link-badge-text" });
    t1.textContent = `${link.bwLabel} | ${effDelay}ms`;
    const t2 = createSvgElement("text", { x: lx, y: ly + 11, class: "link-badge-text" });
    t2.textContent = link.isUp ? `Cost: ${effCost}` : "LINK DOWN";

    g.appendChild(rect);
    g.appendChild(t1);
    g.appendChild(t2);

    g.addEventListener("click", () => onToggleLink(link.id));
    svg.appendChild(g);
  });

  // Draw Router nodes on top
  NODES.forEach((node) => {
    const g = createSvgElement("g", { class: "node-group", "data-node-id": node.id });
    const isSelected = state.selectedRouter === node.id;

    const circ = createSvgElement("circle", {
      cx: node.x, cy: node.y, r: 30,
      class: isSelected ? "node-circle selected" : "node-circle"
    });
    const title = createSvgElement("text", { x: node.x, y: node.y - 2, class: "node-title" });
    title.textContent = node.id;

    const rid = createSvgElement("text", { x: node.x, y: node.y + 13, class: "node-id" });
    rid.textContent = node.name;

    const lan = createSvgElement("text", { x: node.x, y: node.y + node.lanOffsetY, class: "lan-tag" });
    lan.textContent = node.lan;

    g.appendChild(circ);
    g.appendChild(title);
    g.appendChild(rid);
    g.appendChild(lan);

    g.addEventListener("click", () => onSelectRouter(node.id));
    svg.appendChild(g);
  });
}

function renderCongestionChart(state) {
  const svg = document.getElementById("congestion-chart");
  svg.innerHTML = "";

  const padL = 54, padR = 24, padT = 20, padB = 34;
  const w = 640 - padL - padR;
  const h = 210 - padT - padB;

  const xScale = (d) => padL + ((d - 50) / 100) * w;
  const yScale = (y) => padT + h - ((y - 70) / 125) * h;

  // Grid & axes
  [85, 110, 135, 160, 185].forEach((val) => {
    const y = yScale(val);
    svg.appendChild(createSvgElement("line", { x1: padL, y1: y, x2: padL + w, y2: y, stroke: "#E2E8F0", "stroke-width": 1 }));
    const lbl = createSvgElement("text", { x: padL - 8, y: y + 4, "text-anchor": "end", "font-size": "10", fill: "#64748B" });
    lbl.textContent = `${val}ms`;
    svg.appendChild(lbl);
  });

  [50, 75, 100, 125, 150].forEach((d) => {
    const x = xScale(d);
    const lbl = createSvgElement("text", { x, y: padT + h + 16, "text-anchor": "middle", "font-size": "10", fill: "#64748B" });
    lbl.textContent = `${d}ms`;
    svg.appendChild(lbl);
  });

  // Path B constant 85ms (Green)
  svg.appendChild(createSvgElement("line", {
    x1: xScale(50), y1: yScale(85), x2: xScale(150), y2: yScale(85),
    stroke: "#1E8449", "stroke-width": 3
  }));

  // Path A = 35 + d (Red)
  svg.appendChild(createSvgElement("line", {
    x1: xScale(50), y1: yScale(85), x2: xScale(150), y2: yScale(185),
    stroke: "#DC2626", "stroke-width": 3
  }));

  // Live vertical marker
  const curX = xScale(state.jaiMumDelay);
  const curPathA = 35 + state.jaiMumDelay;
  svg.appendChild(createSvgElement("line", {
    x1: curX, y1: padT, x2: curX, y2: padT + h,
    stroke: "#1F3A68", "stroke-width": 1.5, "stroke-dasharray": "4 3"
  }));
  svg.appendChild(createSvgElement("circle", { cx: curX, cy: yScale(curPathA), r: 4.5, fill: "#DC2626" }));
  svg.appendChild(createSvgElement("circle", { cx: curX, cy: yScale(85), r: 4.5, fill: "#1E8449" }));

  // Legend
  const lA = createSvgElement("text", { x: padL + 10, y: padT + 14, "font-size": "11", "font-weight": "700", fill: "#DC2626" });
  lA.textContent = `● Path A (Jaipur–Mumbai): ${curPathA} ms`;
  const lB = createSvgElement("text", { x: padL + 220, y: padT + 14, "font-size": "11", "font-weight": "700", fill: "#1E8449" });
  lB.textContent = "● Path B (via Noida): 85 ms";
  svg.appendChild(lA);
  svg.appendChild(lB);
}

function renderRibTable(state, onSelectRouter) {
  const tabsEl = document.getElementById("router-tabs");
  tabsEl.innerHTML = "";
  NODES.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = n.id === state.selectedRouter ? "router-tab active" : "router-tab";
    btn.textContent = `${n.id} (${n.name})`;
    btn.addEventListener("click", () => onSelectRouter(n.id));
    tabsEl.appendChild(btn);
  });

  const tbody = document.getElementById("rib-tbody");
  tbody.innerHTML = "";
  const rows = buildRoutingTable(state.selectedRouter, state);

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const statusClass =
      r.status === "Rerouted"
        ? "status-rerouted"
        : r.status === "Unreachable"
        ? "status-unreachable"
        : "status-unchanged";

    tr.innerHTML = `
      <td class="mono-cell">${r.destLan}<br><small>${r.destName}</small></td>
      <td class="mono-cell">${r.nextHop}</td>
      <td class="mono-cell">${r.outIntf}</td>
      <td class="mono-cell">${r.costText}</td>
      <td><span class="status-pill ${statusClass}">${r.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function appendLog(message, level = "info") {
  const logEl = document.getElementById("event-log");
  const now = new Date().toLocaleTimeString([], { hour12: false });
  const div = document.createElement("div");
  div.className = `log-entry log-${level}`;
  div.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
  logEl.prepend(div);
}
