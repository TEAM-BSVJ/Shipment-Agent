import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  AlertTriangle,
  Clock,
  ShieldCheck,
  DollarSign,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Button, MetricCard } from '../components/common';

export const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  const carrierReliability = [
    { name: 'FedEx Express (Road/Air)', mode: 'ROAD', reliability: 97.4, status: 'MINT', volume: '142 Loads', avgDelay: '+0.4h' },
    { name: 'Lufthansa Cargo (Air)', mode: 'AIR', reliability: 94.1, status: 'MINT', volume: '38 Flights', avgDelay: '+1.1h' },
    { name: 'Maersk Line (Sea)', mode: 'SEA', reliability: 91.2, status: 'MINT', volume: '64 Containers', avgDelay: '+2.8h' },
    { name: 'COSCO Shipping (Sea)', mode: 'SEA', reliability: 86.5, status: 'AMBER', volume: '51 Containers', avgDelay: '+4.2h' },
    { name: 'Swifft Regional Transport (Road)', mode: 'ROAD', reliability: 82.0, status: 'AMBER', volume: '89 Trucks', avgDelay: '+5.6h' },
  ];

  const bottleneckDistribution = [
    { type: 'Missing Commercial Documentation', share: 42, count: 28, color: 'bg-coral-400', textColor: 'text-coral-400' },
    { type: 'Warehouse Dock & Gate-In Cutoffs', share: 28, count: 19, color: 'bg-amber-400', textColor: 'text-amber-400' },
    { type: 'Weight / Tare Discrepancies (>0.5kg)', share: 18, count: 12, color: 'bg-coral-400', textColor: 'text-coral-400' },
    { type: 'Carrier Detention & Terminal Dwell', share: 12, count: 8, color: 'bg-slateText-muted', textColor: 'text-slateText-muted' },
  ];

  const corridorPerformance = [
    { corridor: 'HKG (Hong Kong) -> LAX (Los Angeles)', mode: 'SEA', onTime: '92.4%', avgDwell: '18.2h', riskCount: 2 },
    { corridor: 'PVG (Shanghai) -> FRA (Frankfurt)', mode: 'AIR', onTime: '95.1%', avgDwell: '8.4h', riskCount: 1 },
    { corridor: 'BOM (Mumbai) -> RTM (Rotterdam)', mode: 'SEA', onTime: '88.0%', avgDwell: '24.5h', riskCount: 3 },
    { corridor: 'ORD (Chicago) -> DFW (Dallas)', mode: 'ROAD', onTime: '84.6%', avgDwell: '4.8h', riskCount: 2 },
    { corridor: 'ATL (Atlanta) -> CLT (Charlotte)', mode: 'ROAD', onTime: '98.2%', avgDwell: '1.9h', riskCount: 0 },
  ];

  const handleExportReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Carrier,Mode,On-Time Reliability,Active Volume,Avg Delay Delta',
        ...carrierReliability.map((c) => `"${c.name}",${c.mode},${c.reliability}%,${c.volume},${c.avgDelay}`),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShipRAG_Analytics_Report_${timeframe}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Operational Trends & Bottleneck Analytics
            </h2>
            <span className="text-xs bg-navy-850 text-cyan-400 border border-cyan-400/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Live Macro Telemetry
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Carrier reliability benchmarks, root-cause bottleneck frequencies, and SLA preservation metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Switcher */}
          <div className="flex bg-navy-900 border border-navy-700 rounded p-0.5 text-xs font-mono">
            {(['7d', '30d', '90d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeframe === t
                    ? 'bg-cyan-400 text-navy-950 font-bold'
                    : 'text-slateText-secondary hover:text-white'
                }`}
              >
                {t === '7d' ? 'Last 7 Days' : t === '30d' ? 'Last 30 Days' : 'Last Quarter'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportReport}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Top Telemetry KPI HUD Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mean Time To Resolve (MTTR)"
          value="2.8h"
          deltaText="-35% vs prev month"
          deltaVariant="positive"
          icon={<Clock className="w-4 h-4 text-mint-400" />}
        />
        <MetricCard
          title="First-Time-Right Paperwork"
          value="88.4%"
          deltaText="+8.2% after OCR validation"
          deltaVariant="positive"
          icon={<FileText className="w-4 h-4 text-cyan-400" />}
        />
        <MetricCard
          title="Prevented Demurrage Losses"
          value="$38,400"
          deltaText="14 penalties averted"
          deltaVariant="positive"
          icon={<DollarSign className="w-4 h-4 text-mint-400" />}
        />
        <MetricCard
          title="Human Governance Turnaround"
          value="24 min"
          deltaText="Avg lead approval time"
          deltaVariant="neutral"
          icon={<ShieldCheck className="w-4 h-4 text-violet-400" />}
        />
      </div>

      {/* Primary Analytics Grid: Bottlenecks & Carriers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bottleneck Frequency by Category */}
        <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-coral-400" />
                Bottleneck Root-Cause Distribution
              </h3>
              <p className="text-[11px] text-slateText-secondary mt-0.5 font-sans">
                Relative share of exceptions diagnosed by the background monitoring system.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-coral-400">
              67 Exceptions Total
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {bottleneckDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white truncate max-w-[280px]">{item.type}</span>
                  <span className={`font-bold ${item.textColor}`}>
                    {item.share}% ({item.count} events)
                  </span>
                </div>
                <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden border border-navy-700">
                  <div
                    className={`h-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-navy-850 rounded border border-navy-700/60 text-xs font-mono text-slateText-secondary space-y-1">
            <span className="text-cyan-400 font-bold">Key Operational Finding:</span>
            <p>
              42% of customs clearance delays result from missing commercial invoices before the 12-hour export gate cutoff. Automated vendor nudges reduced this by 18% this cycle.
            </p>
          </div>
        </div>

        {/* Carrier On-Time Reliability Index */}
        <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-mint-400" />
                Carrier On-Time Reliability Index
              </h3>
              <p className="text-[11px] text-slateText-secondary mt-0.5 font-sans">
                Milestone punctuality score weighted by business priority.
              </p>
            </div>
            <span className="text-xs font-mono text-slateText-muted">SLA Threshold: 90%</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-700/80 text-slateText-muted uppercase text-[10px]">
                  <th className="py-2">Carrier Partner</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Reliability</th>
                  <th className="py-2">Active Volume</th>
                  <th className="py-2">Avg Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/40">
                {carrierReliability.map((c, idx) => (
                  <tr key={idx} className="hover:bg-navy-850 transition-colors">
                    <td className="py-2.5 font-bold text-white">{c.name}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-navy-800 text-[10px] text-slateText-secondary">
                        {c.mode}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`font-bold ${
                          c.reliability >= 90 ? 'text-mint-400' : 'text-amber-400'
                        }`}
                      >
                        {c.reliability}%
                      </span>
                    </td>
                    <td className="py-2.5 text-slateText-secondary">{c.volume}</td>
                    <td className="py-2.5 text-slateText-muted">{c.avgDelay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-navy-850 rounded border border-navy-700/60 text-xs font-mono text-slateText-secondary space-y-1">
            <span className="text-amber-400 font-bold">Watchlist Alert:</span>
            <p>
              Swifft Regional Transport shows recurring dock departure delays (+5.6h avg). Auto-escalation flag active for high-priority shipments.
            </p>
          </div>
        </div>
      </div>

      {/* Lane / Corridor Performance & Average Resolution Speeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Average Resolution Turnaround */}
        <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-3 shadow-md lg:col-span-1">
          <div className="pb-2 border-b border-navy-700">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Turnaround Time by Workflow
            </h3>
            <p className="text-[11px] text-slateText-secondary mt-0.5 font-sans">
              Average elapsed hours from detection to full resolution.
            </p>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-white">Missing Invoice Request</span>
              <span className="text-mint-400 font-bold">2.4h avg</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-white">Weight Mismatch Resolution</span>
              <span className="text-amber-400 font-bold">4.1h avg</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-white">Dispatch Reschedule Task</span>
              <span className="text-mint-400 font-bold">1.2h avg</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-white">Human Approval Gateway</span>
              <span className="text-cyan-400 font-bold">24 min avg</span>
            </div>
          </div>
        </div>

        {/* Corridor Performance Grid */}
        <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-3 shadow-md lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              High-Volume Corridors & Port Dwell Benchmarks
            </h3>
            <span className="text-xs font-mono text-slateText-muted">Active Global Lanes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-700/80 text-slateText-muted uppercase text-[10px]">
                  <th className="py-2">Freight Corridor</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">SLA Punctuality</th>
                  <th className="py-2">Avg Terminal Dwell</th>
                  <th className="py-2">Active Bottlenecks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/40">
                {corridorPerformance.map((c, idx) => (
                  <tr key={idx} className="hover:bg-navy-850 transition-colors">
                    <td className="py-2 font-bold text-white">{c.corridor}</td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded bg-navy-800 text-[10px] text-slateText-secondary">
                        {c.mode}
                      </span>
                    </td>
                    <td className="py-2 font-bold text-mint-400">{c.onTime}</td>
                    <td className="py-2 text-slateText-secondary">{c.avgDwell}</td>
                    <td className="py-2">
                      {c.riskCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-coral-400/20 text-coral-400 border border-coral-400/40 text-[10px] font-bold">
                          {c.riskCount} At Risk
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-mint-400/15 text-mint-400 border border-mint-400/30 text-[10px] font-bold">
                          Nominal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
