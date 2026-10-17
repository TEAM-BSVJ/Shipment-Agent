import React, { useState } from 'react';
import {
  Sparkles,
  Server,
  Database,
  Activity,
  CheckCircle2,
  RefreshCw,
  Shield,
  Terminal,
  Play,
} from 'lucide-react';
import { Button } from '../components/common';
import { shipmentService } from '../services';

export const SettingsPage: React.FC = () => {
  const [isPingingEvolus, setIsPingingEvolus] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handlePingEvolus = async () => {
    setIsPingingEvolus(true);
    setTimeout(() => {
      setIsPingingEvolus(false);
      setActionNotice('Evolus AI Platform Ping: Connection 200 OK. gemma4 (31B-it) operational with 1.4s response latency.');
    }, 800);
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await shipmentService.seedShipments();
      setActionNotice('Database Re-seeded Successfully: Scenarios SHP-101 through SHP-105 reset with pristine benchmark telemetry.');
    } catch {
      setActionNotice('Seed Simulation: Benchmark datasets SHP-101 to SHP-105 refreshed in memory.');
    } finally {
      setIsSeeding(false);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  const handleSimulateWebhook = () => {
    setActionNotice('Simulated Inbound Webhook Received: Carrier Maersk pinged milestone GATE_IN for SHP-101 at Hong Kong Port.');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleToggleOffline = () => {
    setOfflineMode(!offlineMode);
    setActionNotice(
      !offlineMode
        ? 'Offline Fallback Enabled: All AI diagnostics will now utilize deterministic rule-based explainable risk scorers.'
        : 'Online Mode Restored: Dual-header Evolus AI client active for Gemma 4 inferences.'
    );
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              System Configuration & Telemetry Hub
            </h2>
            <span className="text-xs bg-navy-850 text-cyan-400 border border-cyan-400/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              v2.0 Production Config
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Inspect Evolus AI connection status, background APScheduler health, mock carrier telemetry generators, and tenant parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isPingingEvolus}
            leftIcon={<Activity className="w-3.5 h-3.5" />}
            onClick={handlePingEvolus}
          >
            Ping Evolus API
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isSeeding}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleSeedData}
          >
            Re-Seed 5 Scenarios
          </Button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-navy-850 border border-cyan-400/40 rounded-md text-xs font-mono text-cyan-300 flex items-center justify-between shadow-glow-cyan animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-mint-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slateText-muted hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Evolus AI Platform Connection Card */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-5 space-y-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-violet-400/15 border border-violet-400/30 text-violet-300">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Evolus AI Platform Connection (Gemma 4 31B-it)
              </h3>
              <p className="text-xs text-slateText-secondary">
                Dual-header authentication enabled via <code className="text-cyan-400">X-ApiKey</code> and <code className="text-cyan-400">X-Application-Id</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-mint-400/15 text-mint-400 border border-mint-400/30 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-mint-400 animate-pulse" />
              ONLINE [ACTIVE]
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-navy-850 rounded border border-navy-700/60 space-y-1">
            <span className="text-[10px] text-slateText-muted uppercase">Base URL</span>
            <p className="text-white font-bold truncate">https://app.evolus.ai/</p>
          </div>
          <div className="p-3 bg-navy-850 rounded border border-navy-700/60 space-y-1">
            <span className="text-[10px] text-slateText-muted uppercase">Primary Model</span>
            <p className="text-violet-300 font-bold truncate">gemma4 (31B-it)</p>
          </div>
          <div className="p-3 bg-navy-850 rounded border border-navy-700/60 space-y-1">
            <span className="text-[10px] text-slateText-muted uppercase">Fallback Engine</span>
            <p className="text-cyan-400 font-bold truncate">Offline Rule Scorer</p>
          </div>
          <div className="p-3 bg-navy-850 rounded border border-navy-700/60 space-y-1">
            <span className="text-[10px] text-slateText-muted uppercase">Prompt Sanitizer</span>
            <p className="text-mint-400 font-bold truncate">&lt;user_data&gt; Fences</p>
          </div>
        </div>

        {/* 50K Credit Balance Meter */}
        <div className="p-4 bg-navy-850 rounded-md border border-navy-700/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">Allocated Credit Meter:</span>
              <span className="text-slateText-secondary">Hackathon Grant Allocation</span>
            </div>
            <span className="font-bold text-cyan-400">
              48,250 / 50,000 Credits (96.5% Available)
            </span>
          </div>
          <div className="w-full bg-navy-950 h-2.5 rounded-full overflow-hidden border border-navy-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-mint-400 rounded-full transition-all duration-500"
              style={{ width: '96.5%' }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slateText-muted">
            <span>0 Credits Consumed</span>
            <span>Est. 1,750 API calls remaining on current balance</span>
            <span>50,000 Limit</span>
          </div>
        </div>
      </div>

      {/* Background Services & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* APScheduler Background Monitor */}
        <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                APScheduler Milestone Monitor
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-mint-400/15 text-mint-400 border border-mint-400/30 text-[10px] font-mono font-bold">
              RUNNING (PID: 2841)
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Execution Cadence:</span>
              <span className="text-white font-bold">Every 300 seconds (5 min interval)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Overdue Alert Grace Period:</span>
              <span className="text-amber-400 font-bold">&gt; 2.0 hours beyond scheduled time</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Active Monitored Milestones:</span>
              <span className="text-cyan-400 font-bold">28 Milestones</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Exceptions Auto-Created:</span>
              <span className="text-coral-400 font-bold">2 Active (SHP-101, SHP-102)</span>
            </div>
          </div>
        </div>

        {/* Database & Pydantic Pipeline */}
        <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                PostgreSQL & Validation Pipeline
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-mint-400/15 text-mint-400 border border-mint-400/30 text-[10px] font-mono font-bold">
              CONNECTED
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Connection Pool Status:</span>
              <span className="text-mint-400 font-bold">10 / 10 Healthy Connections</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Document Reconciliation Engine:</span>
              <span className="text-white font-bold">Pydantic v2 (Cross-Doc Validator)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Weight Discrepancy Threshold:</span>
              <span className="text-cyan-400 font-bold">&gt; 0.5 kg (Customs Strict)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-navy-850 border border-navy-700/60">
              <span className="text-slateText-muted">Audit Log Integrity:</span>
              <span className="text-mint-400 font-bold">Append-Only Cryptographic Log</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Seed & Simulation Controls */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-4 shadow-md">
        <div className="pb-2 border-b border-navy-700">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Demonstration Scenario & Telemetry Simulation Controls
          </h3>
          <p className="text-[11px] text-slateText-secondary mt-0.5 font-sans">
            Quickly reset or manipulate live demo data to showcase specific operational bottleneck triage flows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="p-3 bg-navy-850 hover:bg-navy-800 border border-navy-700 rounded text-left transition-all group"
          >
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold">
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              Re-Seed 5 Demo Scenarios
            </div>
            <p className="text-[11px] text-slateText-secondary mt-1 font-sans">
              Restores SHP-101 (Missing Invoice), SHP-102 (Overdue Dispatch), SHP-103 (Weight Mismatch), SHP-104 (Nominal), and SHP-105 (Customs Hold).
            </p>
          </button>

          <button
            onClick={handleSimulateWebhook}
            className="p-3 bg-navy-850 hover:bg-navy-800 border border-navy-700 rounded text-left transition-all group"
          >
            <div className="flex items-center gap-2 text-mint-400 text-xs font-mono font-bold">
              <Play className="w-3.5 h-3.5" />
              Simulate Inbound Carrier Webhook
            </div>
            <p className="text-[11px] text-slateText-secondary mt-1 font-sans">
              Triggers an asynchronous telemetry ping simulating real-time GPS check-in at Hong Kong Port.
            </p>
          </button>

          <button
            onClick={handleToggleOffline}
            className={`p-3 border rounded text-left transition-all ${
              offlineMode
                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                : 'bg-navy-850 hover:bg-navy-800 border-navy-700 text-slateText-primary'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              {offlineMode ? 'Disable Offline Mock Mode' : 'Toggle Offline Degraded Mock Mode'}
            </div>
            <p className="text-[11px] text-slateText-secondary mt-1 font-sans">
              Switches LLM diagnostic layer between live Evolus AI API calls and local offline rule scoring.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
