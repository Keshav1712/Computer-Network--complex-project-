const NODES = [
  { id: "DEL", name: "Delhi", routerId: "1.1.1.1", lan: "192.168.10.0/24", gw: "192.168.10.1", pc: "192.168.10.10", x: 400, y: 85, lanOffsetY: -48 },
  { id: "NOI", name: "Noida", routerId: "2.2.2.2", lan: "192.168.20.0/24", gw: "192.168.20.1", pc: "192.168.20.10", x: 645, y: 215, lanOffsetY: -46 },
  { id: "JAI", name: "Jaipur", routerId: "3.3.3.3", lan: "192.168.30.0/24", gw: "192.168.30.1", pc: "192.168.30.10", x: 155, y: 215, lanOffsetY: -46 },
  { id: "MUM", name: "Mumbai", routerId: "4.4.4.4", lan: "192.168.40.0/24", gw: "192.168.40.1", pc: "192.168.40.10", x: 245, y: 425, lanOffsetY: 52 },
  { id: "BLR", name: "Bengaluru", routerId: "5.5.5.5", lan: "192.168.50.0/24", gw: "192.168.50.1", pc: "192.168.50.10", x: 555, y: 425, lanOffsetY: 52 }
];

const INITIAL_LINKS = [
  { id: "L1", u: "DEL", v: "NOI", subnet: "10.0.1.0/30", uIp: "10.0.1.1", vIp: "10.0.1.2", uIntf: "Gi0/0", vIntf: "Gi0/0", bandwidthMbps: 1000, bwLabel: "1 Gbps", baseDelay: 5, ospfCost: 1, labelPos: { x: 565, y: 125 } },
  { id: "L2", u: "DEL", v: "JAI", subnet: "10.0.2.0/30", uIp: "10.0.2.1", vIp: "10.0.2.2", uIntf: "Gi0/1", vIntf: "Gi0/0", bandwidthMbps: 500, bwLabel: "500 Mbps", baseDelay: 15, ospfCost: 2, labelPos: { x: 235, y: 125 } },
  { id: "L3", u: "JAI", v: "MUM", subnet: "10.0.3.0/30", uIp: "10.0.3.1", vIp: "10.0.3.2", uIntf: "Gi0/1", vIntf: "Gi0/0", bandwidthMbps: 200, bwLabel: "200 Mbps", baseDelay: 50, ospfCost: 5, labelPos: { x: 128, y: 335 } },
  { id: "L4", u: "MUM", v: "BLR", subnet: "10.0.4.0/30", uIp: "10.0.4.1", vIp: "10.0.4.2", uIntf: "Gi0/1", vIntf: "Gi0/1", bandwidthMbps: 1000, bwLabel: "1 Gbps", baseDelay: 20, ospfCost: 1, labelPos: { x: 400, y: 462 } },
  { id: "L5", u: "NOI", v: "BLR", subnet: "10.0.5.0/30", uIp: "10.0.5.1", vIp: "10.0.5.2", uIntf: "Gi0/1", vIntf: "Gi0/0", bandwidthMbps: 100, bwLabel: "100 Mbps", baseDelay: 80, ospfCost: 10, labelPos: { x: 672, y: 335 } }
];
