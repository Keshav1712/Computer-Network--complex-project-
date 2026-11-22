function getEffectiveCost(link, state) {
  if (link.id === "L3" && state.overrideJaiMumCost) {
    return 10;
  }
  return link.ospfCost;
}

function getEffectiveDelay(link, state) {
  if (link.id === "L3") {
    return state.jaiMumDelay;
  }
  return link.baseDelay;
}

function getEdgeWeight(link, mode, state) {
  if (mode === "ospf") {
    return getEffectiveCost(link, state);
  }
  if (mode === "delay") {
    return getEffectiveDelay(link, state);
  }
  if (mode === "bandwidth") {
    return 10000 / link.bandwidthMbps;
  }
  return getEffectiveCost(link, state);
}

function computeShortestPath(sourceId, targetId, mode, state, overrideLinks) {
  if (sourceId === targetId) {
    return {
      pathNodes: [sourceId],
      pathLinks: [],
      totalCost: 0,
      totalDelay: 0,
      bottleneckBw: Infinity,
      reachable: true
    };
  }

  const links = overrideLinks || state.links;
  const dist = {};
  const prevNode = {};
  const prevLink = {};
  const unvisited = new Set();

  NODES.forEach((n) => {
    dist[n.id] = Infinity;
    prevNode[n.id] = null;
    prevLink[n.id] = null;
    unvisited.add(n.id);
  });

  dist[sourceId] = 0;

  while (unvisited.size > 0) {
    let current = null;
    let bestDist = Infinity;

    unvisited.forEach((id) => {
      if (dist[id] < bestDist) {
        bestDist = dist[id];
        current = id;
      }
    });

    if (current === null || current === targetId) {
      break;
    }

    unvisited.delete(current);

    links.forEach((link) => {
      if (!link.isUp) return;
      let neighbor = null;
      if (link.u === current) neighbor = link.v;
      else if (link.v === current) neighbor = link.u;

      if (!neighbor || !unvisited.has(neighbor)) return;

      const weight = getEdgeWeight(link, mode, state);
      const alt = dist[current] + weight;
      if (alt < dist[neighbor]) {
        dist[neighbor] = alt;
        prevNode[neighbor] = current;
        prevLink[neighbor] = link;
      }
    });
  }

  if (dist[targetId] === Infinity) {
    return {
      pathNodes: [],
      pathLinks: [],
      totalCost: Infinity,
      totalDelay: Infinity,
      bottleneckBw: 0,
      reachable: false
    };
  }

  const pathNodes = [];
  const pathLinks = [];
  let curr = targetId;

  while (curr !== null) {
    pathNodes.unshift(curr);
    if (prevLink[curr]) {
      pathLinks.unshift(prevLink[curr]);
    }
    curr = prevNode[curr];
  }

  const totalCost = pathLinks.reduce((sum, l) => sum + getEffectiveCost(l, state), 0);
  const totalDelay = pathLinks.reduce((sum, l) => sum + getEffectiveDelay(l, state), 0);
  const bottleneckBw = pathLinks.reduce((min, l) => Math.min(min, l.bandwidthMbps), Infinity);

  return {
    pathNodes,
    pathLinks: pathLinks.map((l) => l.id),
    totalCost,
    totalDelay,
    bottleneckBw,
    reachable: true
  };
}

function getNextHopInfo(routerId, link) {
  if (link.u === routerId) {
    return { nextHopIp: link.vIp, outIntf: link.uIntf, nextNode: link.v };
  }
  return { nextHopIp: link.uIp, outIntf: link.vIntf, nextNode: link.u };
}

function buildRoutingTable(routerId, state) {
  const baselineState = {
    jaiMumDelay: 50,
    overrideJaiMumCost: false,
    links: INITIAL_LINKS.map((l) => ({ ...l, isUp: true }))
  };

  return NODES.filter((n) => n.id !== routerId).map((destNode) => {
    const current = computeShortestPath(routerId, destNode.id, "ospf", state);
    const baseline = computeShortestPath(routerId, destNode.id, "ospf", baselineState, baselineState.links);

    if (!current.reachable) {
      return {
        destName: destNode.name,
        destLan: destNode.lan,
        nextHop: "—",
        outIntf: "—",
        costText: "∞",
        status: "Unreachable"
      };
    }

    const firstLink = state.links.find((l) => l.id === current.pathLinks[0]);
    const hop = getNextHopInfo(routerId, firstLink);

    const baseFirstLink = baselineState.links.find((l) => l.id === baseline.pathLinks[0]);
    const baseHop = getNextHopInfo(routerId, baseFirstLink);

    const isRerouted = hop.nextHopIp !== baseHop.nextHopIp || current.totalCost !== baseline.totalCost;

    return {
      destName: destNode.name,
      destLan: destNode.lan,
      nextHop: `${hop.nextHopIp} (${hop.nextNode})`,
      outIntf: hop.outIntf,
      costText: `${current.totalCost} (${current.totalCost + 1} in IOS)`,
      status: isRerouted ? "Rerouted" : "Unchanged"
    };
  });
}
