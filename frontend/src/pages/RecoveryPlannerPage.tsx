import React, { useState } from 'react';
import {
  Navigation,
  AlertTriangle,
  Plane,
  Ship,
  Truck,
  DollarSign,
  Clock,
  Leaf,
  CheckCircle2,
  Download,
  BookmarkPlus,
  Play,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../components/common';

interface ScenarioOption {
  id: 'option-a' | 'option-b' | 'option-c';
  title: string;
  carrier: string;
  mode: 'SEA' | 'AIR' | 'ROAD';
  projectedArrival: string;
  delayStatus: string;
  additionalCost: number;
  demurrageRisk: string;
  carbonDelta: string;
  feasibilityScore: number;
  recommended?: boolean;
  notes: string;
}

export const RecoveryPlannerPage: React.FC = () => {
  const [selectedShipment, setSelectedShipment] = useState<'SHP-101' | 'SHP-102' | 'SHP-103'>('SHP-101');
  const [simulatedOption, setSimulatedOption] = useState<'option-a' | 'option-b' | 'option-c'>('option-b');
  const [isSimulating, setIsSimulating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const scenarios: Record<string, { dilemma: string; options: ScenarioOption[] }> = {
    'SHP-101': {
      dilemma: 'Missing commercial invoice at Mumbai Port export gate has triggered customs hold. Scheduled container cutoff expires in 8 hours. If missed, cargo waits 7 days for next vessel.',
      options: [
        {
          id: 'option-a',
          title: 'Option A: Retain Ocean Freight (Maersk MSK-ANTARES)',
          carrier: 'Maersk Line',
          mode: 'SEA',
          projectedArrival: '2026-11-12 18:00 UTC (+7 Days Delayed)',
          delayStatus: 'CRITICAL DELAY (+168h)',
          additionalCost: 0,
          demurrageRisk: 'High ($450/day terminal storage after 48h)',
          carbonDelta: 'Baseline (1.8 t CO2)',
          feasibilityScore: 42,
          notes: 'Requires invoice submission within 2 hours or roll to next voyage.',
        },
        {
          id: 'option-b',
          title: 'Option B: Emergency Air Expedite (Cathay Cargo CX-092)',
          carrier: 'Cathay Pacific Cargo',
          mode: 'AIR',
          projectedArrival: '2026-11-06 08:30 UTC (On SLA Schedule)',
          delayStatus: 'ON SCHEDULE (0h delay)',
          additionalCost: 3450,
          demurrageRisk: 'Zero ($0 demurrage risk)',
          carbonDelta: '+4.2 t CO2 (High emissions)',
          feasibilityScore: 94,
          recommended: true,
          notes: 'Direct BOM -> AMS air bridge. Guaranteed departure at 23:45 UTC.',
        },
        {
          id: 'option-c',
          title: 'Option C: Feeder Reroute via Jebel Ali Hub',
          carrier: 'Hapag-Lloyd Hub Express',
          mode: 'SEA',
          projectedArrival: '2026-11-08 14:00 UTC (+3 Days Delayed)',
          delayStatus: 'MODERATE DELAY (+72h)',
          additionalCost: 1120,
          demurrageRisk: 'Moderate ($200 fee)',
          carbonDelta: '+0.6 t CO2',
          feasibilityScore: 78,
          notes: 'Transshipment through UAE reduces demurrage exposure by 60%.',
        },
      ],
    },
    'SHP-102': {
      dilemma: 'Warehouse dispatch in Dallas is +4.2 hours overdue due to dock staging congestion. Promised SLA delivery in Austin at risk.',
      options: [
        {
          id: 'option-a',
          title: 'Option A: Wait for Scheduled Dedicated Truck',
          carrier: 'FedEx Express Freight',
          mode: 'ROAD',
          projectedArrival: '2026-11-05 22:00 UTC (+6h Late)',
          delayStatus: 'AT RISK (+6h)',
          additionalCost: 0,
          demurrageRisk: 'Low ($0)',
          carbonDelta: 'Baseline (0.4 t CO2)',
          feasibilityScore: 65,
          notes: 'Driver estimated dock departure at 16:00 UTC.',
        },
        {
          id: 'option-b',
          title: 'Option B: Hot-Shot Regional Courier Relay',
          carrier: 'Lone Star Courier Express',
          mode: 'ROAD',
          projectedArrival: '2026-11-05 16:30 UTC (Within SLA Window)',
          delayStatus: 'ON SCHEDULE (SLA met)',
          additionalCost: 480,
          demurrageRisk: 'Zero ($0)',
          carbonDelta: '+0.1 t CO2',
          feasibilityScore: 91,
          recommended: true,
          notes: 'Immediate driver pickup from Dallas warehouse with 3.5h direct transit.',
        },
      ],
    },
    'SHP-103': {
      dilemma: 'Weight discrepancy (+60.0 kg) between Commercial Invoice (250 kg) and Packing List (310 kg) flagged at Shanghai customs.',
      options: [
        {
          id: 'option-a',
          title: 'Option A: Full Physical Customs Re-Inspection',
          carrier: 'COSCO Shipping Lines',
          mode: 'SEA',
          projectedArrival: '2026-11-18 10:00 UTC (+5 Days Late)',
          delayStatus: 'HELD (+120h)',
          additionalCost: 650,
          demurrageRisk: 'Severe ($800 inspection + storage fee)',
          carbonDelta: 'Baseline (2.1 t CO2)',
          feasibilityScore: 38,
          notes: 'Container unstuffed at bonded terminal. High risk of inspection damage.',
        },
        {
          id: 'option-b',
          title: 'Option B: Shipper Tare Weight Electronic Amendment',
          carrier: 'COSCO Shipping Lines',
          mode: 'SEA',
          projectedArrival: '2026-11-13 14:00 UTC (Nominal Schedule)',
          delayStatus: 'MINIMAL DELAY (+4h)',
          additionalCost: 75,
          demurrageRisk: 'Low ($0)',
          carbonDelta: 'Baseline (2.1 t CO2)',
          feasibilityScore: 89,
          recommended: true,
          notes: 'Submit revised packing list explaining 60kg wooden pallet tare weight.',
        },
      ],
    },
  };

  const currentScenario = scenarios[selectedShipment] || scenarios['SHP-101'];
  const activeOptionData = currentScenario.options.find((o) => o.id === simulatedOption) || currentScenario.options[0];

  const handleSimulate = (optionId: 'option-a' | 'option-b' | 'option-c') => {
    setIsSimulating(true);
    setSimulatedOption(optionId);
    setTimeout(() => {
      setIsSimulating(false);
      setNotification(`Simulation Engine: Projected model updated for ${optionId.toUpperCase()} with 95% confidence.`);
    }, 400);
  };

  const handleExportBriefing = () => {
    const text = `AETHERIS FREIGHT COMMAND — RECOVERY SCENARIO BRIEFING
==============================================================
Shipment: ${selectedShipment}
Simulated Plan: ${activeOptionData.title}
Mode: ${activeOptionData.mode} | Carrier: ${activeOptionData.carrier}
Projected Arrival: ${activeOptionData.projectedArrival}
Delay Delta: ${activeOptionData.delayStatus}
Additional Cost: $${activeOptionData.additionalCost.toFixed(2)} USD
Demurrage Risk: ${activeOptionData.demurrageRisk}
Carbon Delta: ${activeOptionData.carbonDelta}
Feasibility Score: ${activeOptionData.feasibilityScore}/100
Operational Notes: ${activeOptionData.notes}
Timestamp: ${new Date().toISOString()}
Compliance: Subject to Lead Dispatcher Approval before booking execution.
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AETHERIS_Recovery_Briefing_${selectedShipment}_${activeOptionData.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveNotes = () => {
    setNotification(`Scenario ${activeOptionData.title} saved to shipment operational log for audit record.`);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Recovery Planner & Scenario Simulator
            </h2>
            <span className="text-xs bg-violet-400/15 text-violet-300 border border-violet-400/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Predictive Rerouting (Future Feature)
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Model alternative corridors, carrier expedite tradeoffs, cost-to-SLA curves, and emissions impact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportBriefing}
          >
            Export Briefing
          </Button>
          <Button
            variant="agent"
            size="sm"
            leftIcon={<BookmarkPlus className="w-3.5 h-3.5" />}
            onClick={handleSaveNotes}
          >
            Save Scenario
          </Button>
        </div>
      </div>

      {/* Architectural Disclaimer Banner */}
      <div className="p-3 bg-navy-900 border border-violet-400/40 rounded-md text-xs font-mono text-violet-200 flex items-start gap-2.5 shadow-md">
        <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-violet-300">Simulated Recovery Engine:</span>{' '}
          Demonstrates future predictive routing capabilities. Not bound to live carrier booking APIs in the current MVP release. All capacity ratings and freight spot quotes are calculated using deterministic simulation heuristics.
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-navy-850 border border-mint-400/40 rounded-md text-xs font-mono text-mint-300 flex items-center justify-between shadow-glow-mint animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-mint-400" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slateText-muted hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Disrupted Shipment Selector & Current Dilemma */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slateText-muted uppercase">
              Target Disrupted Cargo:
            </span>
            <div className="flex gap-2">
              {(['SHP-101', 'SHP-102', 'SHP-103'] as const).map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setSelectedShipment(id);
                    setSimulatedOption('option-b');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                    selectedShipment === id
                      ? 'bg-cyan-400 text-navy-950 font-extrabold shadow-glow-cyan'
                      : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slateText-muted">
            <span>Active Model:</span>
            <span className="text-cyan-400 font-bold">Multi-Objective Pareto Solver</span>
          </div>
        </div>

        <div className="p-3 rounded bg-navy-950 border border-navy-700/80 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-coral-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-white font-mono uppercase">Operational Dilemma:</span>{' '}
            <span className="text-slateText-secondary font-sans">{currentScenario.dilemma}</span>
          </div>
        </div>
      </div>

      {/* Comparative Recovery Matrix */}
      <div className="bg-navy-900 border border-navy-700 rounded-md shadow-md overflow-hidden">
        <div className="p-4 border-b border-navy-700 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Comparative Recovery Options Matrix
          </h3>
          <span className="text-xs font-mono text-slateText-muted">
            Click an option below to simulate trajectory impact
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {currentScenario.options.map((option) => {
            const isSelected = simulatedOption === option.id;
            return (
              <div
                key={option.id}
                onClick={() => handleSimulate(option.id)}
                className={`relative rounded-md border p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-navy-850 border-cyan-400 shadow-glow-cyan ring-1 ring-cyan-400'
                    : 'bg-navy-900 border-navy-700 hover:border-slateText-muted/50 hover:bg-navy-850/60'
                }`}
              >
                {option.recommended && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-mint-400 text-navy-950 shadow-sm">
                    AI RECOMMENDED
                  </span>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {option.mode === 'AIR' && <Plane className="w-4 h-4 text-cyan-400" />}
                    {option.mode === 'SEA' && <Ship className="w-4 h-4 text-cyan-400" />}
                    {option.mode === 'ROAD' && <Truck className="w-4 h-4 text-mint-400" />}
                    <h4 className="text-xs font-bold text-white font-mono">{option.title}</h4>
                  </div>
                  <p className="text-[11px] text-slateText-muted font-mono">Carrier: {option.carrier}</p>
                </div>

                <div className="space-y-2 py-2 border-y border-navy-700/60 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slateText-muted flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slateText-muted" /> ETA:
                    </span>
                    <span className="text-white text-right text-[11px]">{option.projectedArrival}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slateText-muted">Delay Delta:</span>
                    <span
                      className={`text-[11px] font-bold ${
                        option.delayStatus.includes('ON SCHEDULE')
                          ? 'text-mint-400'
                          : option.delayStatus.includes('CRITICAL')
                          ? 'text-coral-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {option.delayStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slateText-muted flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-slateText-muted" /> Addl. Cost:
                    </span>
                    <span className="text-white font-bold">
                      {option.additionalCost === 0 ? '$0.00' : `+$${option.additionalCost.toLocaleString()} USD`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slateText-muted">Demurrage Risk:</span>
                    <span className="text-slateText-secondary text-[11px] text-right truncate max-w-[160px]">
                      {option.demurrageRisk}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slateText-muted flex items-center gap-1">
                      <Leaf className="w-3 h-3 text-slateText-muted" /> Emissions:
                    </span>
                    <span className="text-slateText-secondary text-[11px]">{option.carbonDelta}</span>
                  </div>
                </div>

                {/* Feasibility Score Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slateText-muted">Feasibility Rating:</span>
                    <span className={`font-bold ${option.feasibilityScore >= 80 ? 'text-mint-400' : 'text-amber-400'}`}>
                      {option.feasibilityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-navy-950 h-1.5 rounded-full overflow-hidden border border-navy-700">
                    <div
                      className={`h-full transition-all duration-300 ${
                        option.feasibilityScore >= 80 ? 'bg-mint-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${option.feasibilityScore}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant={isSelected ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full text-xs"
                  isLoading={isSimulating && isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSimulate(option.id);
                  }}
                  leftIcon={isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                >
                  {isSelected ? 'Active Simulated Plan' : 'Simulate Trajectory'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Trajectory & Decision Impact Panel */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-navy-700">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <Navigation className="w-4 h-4 text-cyan-400" />
            Projected Trajectory & Decision Trade-Off Breakdown
          </h3>
          <span className="text-xs font-mono text-cyan-400">
            Selected: {activeOptionData.title}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-navy-850 rounded border border-navy-700 space-y-1">
            <span className="text-[10px] font-mono text-slateText-muted uppercase">SLA Recovery Impact</span>
            <p className="text-base font-bold font-mono text-white">
              {activeOptionData.delayStatus.includes('ON SCHEDULE') ? '100% SLA Preserved' : 'SLA Breach Predicted'}
            </p>
            <p className="text-xs text-slateText-secondary">{activeOptionData.projectedArrival}</p>
          </div>

          <div className="p-3 bg-navy-850 rounded border border-navy-700 space-y-1">
            <span className="text-[10px] font-mono text-slateText-muted uppercase">Financial Delta</span>
            <p className="text-base font-bold font-mono text-white">
              +${activeOptionData.additionalCost.toFixed(2)} USD
            </p>
            <p className="text-xs text-slateText-secondary">Demurrage: {activeOptionData.demurrageRisk}</p>
          </div>

          <div className="p-3 bg-navy-850 rounded border border-navy-700 space-y-1">
            <span className="text-[10px] font-mono text-slateText-muted uppercase">Execution Feasibility</span>
            <p className="text-base font-bold font-mono text-mint-400">
              {activeOptionData.feasibilityScore}% High Confidence
            </p>
            <p className="text-xs text-slateText-secondary">Carrier capacity verified in staging</p>
          </div>
        </div>

        <div className="p-3 bg-navy-950 border border-navy-700/60 rounded text-xs font-mono text-slateText-secondary space-y-1">
          <p className="font-bold text-white uppercase">Operational Lead Guidelines:</p>
          <p>
            {activeOptionData.notes} Expedited bookings require verbal authorization with carrier freight desk before committing system purchase orders.
          </p>
        </div>
      </div>
    </div>
  );
};
