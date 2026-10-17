import React, { useState } from 'react';
import {
  Anchor,
  Plane,
  Building2,
  ShieldAlert,
  Flame,
  Radio,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Table as TableIcon,
  Compass,
} from 'lucide-react';
import { Shipment } from '../../types';
import { WORLD_LAND_PATH, WORLD_BORDERS_PATH, projectGeo } from './worldMapData';

interface LogisticsMapProps {
  shipments: Shipment[];
  selectedShipmentId?: string | null;
  onSelectShipment: (shipment: Shipment) => void;
  className?: string;
}

interface GeoNode {
  id: string;
  name: string;
  code: string;
  type: 'PORT' | 'AIRPORT' | 'WAREHOUSE' | 'CUSTOMS';
  x: number; // 0 to 1000 coordinate on SVG canvas
  y: number; // 0 to 500 coordinate on SVG canvas
}

// Precise global freight nodes mathematically projected from real-world GPS coordinates
const FREIGHT_NODES: Record<string, GeoNode> = {
  BOM: { id: 'BOM', name: 'Mumbai Port (JNPT)', code: 'IN-BOM', type: 'PORT', ...projectGeo(18.94, 72.83) },
  RTM: { id: 'RTM', name: 'Rotterdam Port', code: 'NL-RTM', type: 'PORT', ...projectGeo(51.92, 4.48) },
  DFW: { id: 'DFW', name: 'Dallas Logistics DC', code: 'US-DFW', type: 'WAREHOUSE', ...projectGeo(32.78, -96.80) },
  AUS: { id: 'AUS', name: 'Austin Fulfillment Hub', code: 'US-AUS', type: 'WAREHOUSE', ...projectGeo(30.27, -97.74) },
  SHA: { id: 'SHA', name: 'Shanghai Port (Yangshan)', code: 'CN-SHA', type: 'PORT', ...projectGeo(31.23, 121.47) },
  LAX: { id: 'LAX', name: 'Los Angeles Port / Long Beach', code: 'US-LAX', type: 'PORT', ...projectGeo(34.05, -118.24) },
  FRA: { id: 'FRA', name: 'Frankfurt Cargo Hub', code: 'DE-FRA', type: 'AIRPORT', ...projectGeo(50.11, 8.68) },
  ORD: { id: 'ORD', name: 'Chicago O\'Hare Air Hub', code: 'US-ORD', type: 'AIRPORT', ...projectGeo(41.88, -87.63) },
  ATL: { id: 'ATL', name: 'Atlanta Regional Gateway', code: 'US-ATL', type: 'WAREHOUSE', ...projectGeo(33.75, -84.39) },
  CLT: { id: 'CLT', name: 'Charlotte Distribution Center', code: 'US-CLT', type: 'WAREHOUSE', ...projectGeo(35.23, -80.84) },
  HKG: { id: 'HKG', name: 'Hong Kong Port (Kwai Chung)', code: 'HK-HKG', type: 'PORT', ...projectGeo(22.32, 114.17) },
  SIN: { id: 'SIN', name: 'Singapore PSA Terminal', code: 'SG-SIN', type: 'PORT', ...projectGeo(1.35, 103.82) },
};

// Map shipment tracking ID to origin and destination nodes
const SHIPMENT_ROUTES: Record<
  string,
  {
    origin: GeoNode;
    dest: GeoNode;
    bottleneckNode?: GeoNode;
    arcHeight: number;
  }
> = {
  'SHP-101': {
    origin: FREIGHT_NODES.BOM,
    dest: FREIGHT_NODES.RTM,
    bottleneckNode: FREIGHT_NODES.BOM,
    arcHeight: -50,
  },
  'SHP-102': {
    origin: FREIGHT_NODES.DFW,
    dest: FREIGHT_NODES.AUS,
    bottleneckNode: FREIGHT_NODES.DFW,
    arcHeight: -20,
  },
  'SHP-103': {
    origin: FREIGHT_NODES.SHA,
    dest: FREIGHT_NODES.LAX,
    bottleneckNode: FREIGHT_NODES.LAX,
    arcHeight: -65,
  },
  'SHP-104': {
    origin: FREIGHT_NODES.ATL,
    dest: FREIGHT_NODES.CLT,
    arcHeight: -18,
  },
  'SHP-105': {
    origin: FREIGHT_NODES.FRA,
    dest: FREIGHT_NODES.ORD,
    bottleneckNode: FREIGHT_NODES.ORD,
    arcHeight: -55,
  },
};

export const LogisticsMap: React.FC<LogisticsMapProps> = ({
  shipments,
  selectedShipmentId,
  onSelectShipment,
  className = '',
}) => {
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false);
  const [hoveredShipment, setHoveredShipment] = useState<Shipment | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GeoNode | null>(null);
  const [isTableView, setIsTableView] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const filteredShipments = shipments.filter((s) => {
    if (modeFilter !== 'ALL' && s.mode !== modeFilter) return false;
    if (criticalOnly && s.risk_score < 60) return false;
    return true;
  });

  const activeShipment = shipments.find((s) => s.id === selectedShipmentId);

  // Helper to generate smooth cubic Bezier arc between two coordinates
  const getCurvePath = (start: GeoNode, end: GeoNode, height: number) => {
    // If wrapping around Pacific (e.g. SHA to LAX)
    if (start.x > 750 && end.x < 300) {
      const midY = Math.min(start.y, end.y) + height;
      // Transpacific Great Circle route eastward across the antimeridian
      return `M ${start.x} ${start.y} Q ${(start.x + 1000) / 2} ${midY} 1000 ${midY} M 0 ${midY} Q ${end.x / 2} ${midY} ${end.x} ${end.y}`;
    }
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 + height;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  const getNodeIcon = (type: GeoNode['type'], isCritical?: boolean) => {
    const iconClass = isCritical ? 'text-coral-400' : 'text-cyan-400';
    switch (type) {
      case 'PORT':
        return <Anchor className={`w-3.5 h-3.5 ${iconClass}`} />;
      case 'AIRPORT':
        return <Plane className={`w-3.5 h-3.5 ${iconClass}`} />;
      case 'WAREHOUSE':
        return <Building2 className={`w-3.5 h-3.5 ${iconClass}`} />;
      case 'CUSTOMS':
        return <ShieldAlert className={`w-3.5 h-3.5 ${iconClass}`} />;
    }
  };

  return (
    <div
      className={`relative bg-navy-900 border border-navy-700 rounded-lg overflow-hidden flex flex-col shadow-xl select-none ${className}`}
    >
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Mode & Risk HUD Filters */}
        <div className="flex items-center gap-1.5 bg-navy-950/90 backdrop-blur-md p-1.5 rounded-md border border-navy-700 pointer-events-auto shadow-md">
          <span className="text-[11px] font-semibold uppercase text-slateText-muted px-2 flex items-center gap-1 font-mono">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            Mode
          </span>
          {['ALL', 'SEA', 'AIR', 'ROAD'].map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                modeFilter === mode
                  ? 'bg-cyan-400 text-navy-950 font-bold shadow-sm'
                  : 'text-slateText-secondary hover:text-slateText-primary hover:bg-navy-800'
              }`}
            >
              {mode}
            </button>
          ))}
          <div className="h-4 w-px bg-navy-700 mx-1" />
          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              criticalOnly
                ? 'bg-coral-400/25 text-coral-400 border border-coral-400/60 shadow-glow-coral'
                : 'text-slateText-muted hover:text-coral-400 hover:bg-navy-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-coral-400" />
            Critical Only
          </button>
        </div>

        {/* Right: Map Legend & View Mode Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-3 bg-navy-950/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-navy-700 text-[11px] font-mono text-slateText-muted shadow-md">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              Nominal Transit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-coral-400 inline-block animate-ping" />
              Bottleneck Hold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Overdue Risk
            </span>
          </div>

          <button
            onClick={() => setIsTableView(!isTableView)}
            className="bg-navy-950/90 backdrop-blur-md border border-navy-700 p-2 rounded-md text-slateText-secondary hover:text-cyan-400 transition-colors shadow-md"
            title={isTableView ? 'Switch to Vector Map' : 'Switch to Accessible Grid'}
            aria-label="Toggle map and table view"
          >
            {isTableView ? <Compass className="w-4 h-4" /> : <TableIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Map Canvas or Tabular Grid */}
      {isTableView ? (
        <div className="p-6 overflow-y-auto max-h-[500px] bg-navy-900">
          <h3 className="text-sm font-bold text-slateText-primary mb-3 font-mono">
            Active Geographic Transit Registry
          </h3>
          <table className="w-full text-left text-xs border border-navy-700 rounded overflow-hidden">
            <thead className="bg-navy-800 text-slateText-muted uppercase font-mono">
              <tr>
                <th className="p-2.5">Tracking #</th>
                <th className="p-2.5">Mode</th>
                <th className="p-2.5">Origin &rarr; Dest</th>
                <th className="p-2.5">Carrier</th>
                <th className="p-2.5">Risk Score</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700 font-mono">
              {filteredShipments.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => onSelectShipment(s)}
                  className="hover:bg-navy-850 cursor-pointer text-slateText-secondary hover:text-slateText-primary"
                >
                  <td className="p-2.5 font-bold text-cyan-400">{s.tracking_number}</td>
                  <td className="p-2.5">{s.mode}</td>
                  <td className="p-2.5">
                    {s.origin} &rarr; {s.destination}
                  </td>
                  <td className="p-2.5">{s.carrier_id}</td>
                  <td className="p-2.5 font-bold">
                    <span
                      className={
                        s.risk_score >= 60
                          ? 'text-coral-400'
                          : s.risk_score >= 31
                          ? 'text-amber-400'
                          : 'text-mint-400'
                      }
                    >
                      {s.risk_score}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700 text-[10px]">
                      {s.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">
                    <button className="text-cyan-400 hover:underline text-[11px]">
                      View Corridor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative w-full h-[460px] lg:h-[500px] bg-navy-950 overflow-hidden">
          {/* SVG Vector World Basemap */}
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <defs>
              {/* Radial glow for critical nodes */}
              <radialGradient id="coralGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF5D73" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#FF5D73" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FF5D73" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="cyanGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38D9FF" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#38D9FF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#38D9FF" stopOpacity="0" />
              </radialGradient>

              {/* Grid pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#25364B" strokeWidth="0.4" strokeOpacity="0.25" />
              </pattern>
            </defs>

            {/* Ocean Backdrop */}
            <rect width="1000" height="500" fill="#080D18" />
            <rect width="1000" height="500" fill="url(#grid)" />

            {/* Graticule Grid Lines: Equator, Tropics, Prime Meridian */}
            <g stroke="#18283A" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.65">
              {/* Arctic Circle (66.5° N) */}
              <line x1="0" y1="65.3" x2="1000" y2="65.3" />
              {/* Tropic of Cancer (23.5° N) */}
              <line x1="0" y1="184.7" x2="1000" y2="184.7" />
              {/* Equator (0°) */}
              <line x1="0" y1="250" x2="1000" y2="250" stroke="#25364B" strokeWidth="0.75" />
              {/* Tropic of Capricorn (23.5° S) */}
              <line x1="0" y1="315.3" x2="1000" y2="315.3" />
              {/* Prime Meridian (0°) */}
              <line x1="500" y1="0" x2="500" y2="500" stroke="#25364B" strokeWidth="0.75" />
              {/* -90° (Americas) */}
              <line x1="250" y1="0" x2="250" y2="500" />
              {/* +90° (Asia) */}
              <line x1="750" y1="0" x2="750" y2="500" />
            </g>

            {/* Authentic Natural Earth Landmass Vectors (128 Coastline Polygons) */}
            <path
              d={WORLD_LAND_PATH}
              fill="#101B2B"
              stroke="#25364B"
              strokeWidth="0.75"
              className="transition-colors hover:fill-[#132034]"
            />

            {/* Authentic International Boundary Lines (331 Border Polylines) */}
            <path
              d={WORLD_BORDERS_PATH}
              fill="none"
              stroke="#1C2C42"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              opacity="0.85"
            />

            {/* Active Shipment Route Curves */}
            {filteredShipments.map((s) => {
              const route = SHIPMENT_ROUTES[s.tracking_number];
              if (!route) return null;

              const isSelected = selectedShipmentId === s.id;
              const isCritical = s.risk_score >= 60;
              const isWarning = s.risk_score >= 31 && s.risk_score < 60;
              const pathData = getCurvePath(route.origin, route.dest, route.arcHeight);

              let strokeColor = '#38D9FF';
              let strokeClass = 'filter-route-cyan';
              if (isCritical) {
                strokeColor = '#FF5D73';
                strokeClass = 'filter-route-coral';
              } else if (isWarning) {
                strokeColor = '#FFB547';
                strokeClass = 'filter-route-amber';
              }

              return (
                <g
                  key={s.id}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={selectedShipmentId && !isSelected ? 0.2 : 1}
                  onMouseEnter={() => setHoveredShipment(s)}
                  onMouseLeave={() => setHoveredShipment(null)}
                  onClick={() => onSelectShipment(s)}
                >
                  {/* Outer glow line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 4 : isCritical ? 3 : 2}
                    strokeDasharray={isWarning ? '6,6' : 'none'}
                    className={strokeClass}
                  />

                  {/* Traveling Pulse Motion Dot along the route */}
                  {!isCritical && (
                    <circle r={isSelected ? 4 : 3} fill="#E7EEF8">
                      <animateMotion
                        path={pathData}
                        dur={s.mode === 'AIR' ? '4s' : s.mode === 'ROAD' ? '6s' : '9s'}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Concentric Shockwave Pulse for Critical Bottlenecks */}
            {filteredShipments
              .filter((s) => s.risk_score >= 60)
              .map((s) => {
                const route = SHIPMENT_ROUTES[s.tracking_number];
                const node = route?.bottleneckNode;
                if (!node) return null;
                return (
                  <g key={`shockwave-${s.id}`} transform={`translate(${node.x}, ${node.y})`}>
                    <circle r="22" fill="url(#coralGlow)" className="animate-ping-slow" />
                    <circle r="12" fill="#FF5D73" fillOpacity="0.4" />
                    <circle r="4" fill="#FF5D73" />
                  </g>
                );
              })}

            {/* Operational Nodes (Ports, Warehouses, Airports) with Exact Geographical Coordinates */}
            {Object.values(FREIGHT_NODES).map((node) => {
              // Check if node is part of selected shipment
              const isOrigin = activeShipment && SHIPMENT_ROUTES[activeShipment.tracking_number]?.origin.id === node.id;
              const isDest = activeShipment && SHIPMENT_ROUTES[activeShipment.tracking_number]?.dest.id === node.id;
              const isBottleneck = activeShipment && SHIPMENT_ROUTES[activeShipment.tracking_number]?.bottleneckNode?.id === node.id;

              let markerBg = '#142235';
              let markerBorder = '#25364B';
              if (isBottleneck) {
                markerBg = '#FF5D73';
                markerBorder = '#FF8596';
              } else if (isOrigin || isDest) {
                markerBg = '#38D9FF';
                markerBorder = '#67E3FF';
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Pin Circle */}
                  <circle
                    r={isBottleneck ? 7 : 5}
                    fill={markerBg}
                    stroke={markerBorder}
                    strokeWidth={isBottleneck || isOrigin || isDest ? 2 : 1}
                  />

                  {/* Label tag */}
                  <text
                    y={-8}
                    textAnchor="middle"
                    fill="#9DAEC3"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono"
                    fontWeight="600"
                    className="select-none pointer-events-none group-hover:fill-cyan-300"
                  >
                    {node.code}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Card (Top Left) */}
          {hoveredShipment && (
            <div className="absolute bottom-4 left-4 z-30 bg-navy-900/95 backdrop-blur-md border border-cyan-400/50 p-3 rounded-md shadow-glow-cyan max-w-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-navy-700">
                <span className="font-mono font-bold text-xs text-cyan-400">
                  {hoveredShipment.tracking_number}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    hoveredShipment.risk_score >= 60
                      ? 'bg-coral-400/20 text-coral-400 font-bold'
                      : 'bg-mint-400/20 text-mint-400'
                  }`}
                >
                  RISK: {hoveredShipment.risk_score}/100
                </span>
              </div>
              <p className="text-xs text-slateText-primary font-medium">
                {hoveredShipment.origin} &rarr; {hoveredShipment.destination}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slateText-muted font-mono">
                <span>Mode: {hoveredShipment.mode}</span>
                <span>Carrier: {hoveredShipment.carrier_id}</span>
              </div>
              <div className="mt-2 pt-1 border-t border-navy-700/60 flex items-center justify-between text-[10px] text-cyan-300 font-mono">
                <span>Click route to view detail</span>
                <span className="capitalize">{hoveredShipment.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          )}

          {/* Interactive Node Hover Card */}
          {hoveredNode && !hoveredShipment && (
            <div className="absolute bottom-4 left-4 z-30 bg-navy-900/95 backdrop-blur-md border border-navy-700 p-2.5 rounded-md shadow-lg max-w-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-navy-800">
                  {getNodeIcon(hoveredNode.type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slateText-primary">{hoveredNode.name}</h4>
                  <p className="text-[10px] text-slateText-muted font-mono">
                    {hoveredNode.code} &bull; {hoveredNode.type}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Right Zoom / Reset Controls */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-col items-center bg-navy-950/85 backdrop-blur-md p-1 rounded-md border border-navy-700 shadow-md">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
              className="p-1.5 text-slateText-secondary hover:text-cyan-400 transition-colors"
              title="Zoom In"
              aria-label="Zoom in on map"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-px w-3 bg-navy-700 my-0.5" />
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
              className="p-1.5 text-slateText-secondary hover:text-cyan-400 transition-colors"
              title="Zoom Out"
              aria-label="Zoom out on map"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-px w-3 bg-navy-700 my-0.5" />
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slateText-secondary hover:text-cyan-400 transition-colors"
              title="Reset View"
              aria-label="Reset map zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
