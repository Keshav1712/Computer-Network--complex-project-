const appState = {
  source: "DEL",
  dest: "BLR",
  mode: "ospf",
  selectedRouter: "DEL",
  jaiMumDelay: 50,
  overrideJaiMumCost: false,
  links: INITIAL_LINKS.map((l) => ({ ...l, isUp: true }))
};

function populateRouterDropdowns() {
  const srcEl = document.getElementById("source-select");
  const dstEl = document.getElementById("dest-select");

  NODES.forEach((n) => {
    const opt1 = new Option(`${n.name} (${n.id})`, n.id);
    const opt2 = new Option(`${n.name} (${n.id})`, n.id);
    srcEl.add(opt1);
    dstEl.add(opt2);
  });

  srcEl.value = appState.source;
  dstEl.value = appState.dest;
}

function recalculateAndRender() {
  const pathResult = computeShortestPath(appState.source, appState.dest, appState.mode, appState);
  renderKpiBar(pathResult);
  renderTopology(appState, pathResult, handleToggleLink, handleSelectRouter);
  renderCongestionChart(appState);
  renderRibTable(appState, handleSelectRouter);
}

function handleToggleLink(linkId) {
  const link = appState.links.find((l) => l.id === linkId);
  if (!link) return;
  link.isUp = !link.isUp;

  if (!link.isUp) {
    appendLog(`%OSPF-5-ADJCHG: Link ${link.u}–${link.v} (${link.subnet}) moved FULL → DOWN. SPF recalculated.`, "down");
  } else {
    appendLog(`%OSPF-5-ADJCHG: Link ${link.u}–${link.v} (${link.subnet}) restored to FULL. SPF recalculated.`, "up");
  }

  recalculateAndRender();
}

function handleSelectRouter(routerId) {
  appState.selectedRouter = routerId;
  recalculateAndRender();
}

function resetAll() {
  appState.source = "DEL";
  appState.dest = "BLR";
  appState.mode = "ospf";
  appState.selectedRouter = "DEL";
  appState.jaiMumDelay = 50;
  appState.overrideJaiMumCost = false;
  appState.links = INITIAL_LINKS.map((l) => ({ ...l, isUp: true }));

  document.getElementById("source-select").value = "DEL";
  document.getElementById("dest-select").value = "BLR";
  document.getElementById("mode-select").value = "ospf";
  document.getElementById("congestion-slider").value = "50";
  document.getElementById("congestion-value").textContent = "50 ms";
  document.getElementById("override-cost-checkbox").checked = false;

  appendLog("System reset to healthy baseline (Ref BW = 1000 Mbps).", "info");
  recalculateAndRender();
}

function initApp() {
  populateRouterDropdowns();

  document.getElementById("source-select").addEventListener("change", (e) => {
    appState.source = e.target.value;
    recalculateAndRender();
  });

  document.getElementById("dest-select").addEventListener("change", (e) => {
    appState.dest = e.target.value;
    recalculateAndRender();
  });

  document.getElementById("mode-select").addEventListener("change", (e) => {
    appState.mode = e.target.value;
    appendLog(`Traffic mode switched to "${e.target.value.toUpperCase()}".`, "info");
    recalculateAndRender();
  });

  document.getElementById("congestion-slider").addEventListener("input", (e) => {
    appState.jaiMumDelay = Number(e.target.value);
    document.getElementById("congestion-value").textContent = `${appState.jaiMumDelay} ms`;
    recalculateAndRender();
  });

  document.getElementById("override-cost-checkbox").addEventListener("change", (e) => {
    appState.overrideJaiMumCost = e.target.checked;
    appendLog(
      appState.overrideJaiMumCost
        ? "Manual OSPF cost override enabled: JAI–MUM cost set to 10."
        : "Manual OSPF cost override disabled: JAI–MUM cost restored to 5.",
      "warn"
    );
    recalculateAndRender();
  });

  document.getElementById("btn-reset").addEventListener("click", resetAll);

  document.getElementById("btn-cut-del-noi").addEventListener("click", () => {
    resetAll();
    appState.source = "DEL";
    appState.dest = "NOI";
    document.getElementById("source-select").value = "DEL";
    document.getElementById("dest-select").value = "NOI";
    handleToggleLink("L1");
  });

  document.getElementById("btn-cut-noi-blr").addEventListener("click", () => {
    resetAll();
    appState.selectedRouter = "NOI";
    handleToggleLink("L5");
    appendLog("Observation: Noida–Bengaluru failure alters zero routes anywhere in the ring.", "info");
  });

  document.getElementById("btn-heavy-congestion").addEventListener("click", () => {
    resetAll();
    appState.jaiMumDelay = 100;
    document.getElementById("congestion-slider").value = "100";
    document.getElementById("congestion-value").textContent = "100 ms";
    appendLog("Heavy congestion simulated on Jaipur–Mumbai (100 ms). Path A = 135 ms vs Path B = 85 ms.", "warn");
    recalculateAndRender();
  });

  document.getElementById("btn-clear-log").addEventListener("click", () => {
    document.getElementById("event-log").innerHTML = "";
  });

  appendLog("OSPF Area 0 converged. 5 routers online, Reference BW = 1000 Mbps.", "up");
  recalculateAndRender();
}

document.addEventListener("DOMContentLoaded", initApp);
