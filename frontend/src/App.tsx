import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Radio,
  Server,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Logistics Bottleneck Resolution Agent
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Control Tower
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Autonomous Exception Monitoring, Diagnosis & Human-Gated Remediation
            </p>
          </div>
        </div>

        {/* Global System & Model Status Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <Bot className="w-4 h-4 text-violet-600" />
            <span>AI Model:</span>
            <span className="font-mono text-slate-900 font-semibold">gemma4 31B-it (Evolus)</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>FastAPI:</span>
            <span className="font-mono text-emerald-700 font-semibold">:8000/api/v1</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Tenant:</span>
            <span className="font-mono text-slate-900 font-semibold">DEFAULT_TENANT</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Status Callout Banner */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
                  Milestone 6 / Unit 6.1 Verified
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  React 18 + Vite + TypeScript + Tailwind CSS
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Frontend Control Tower Scaffolding Initialized
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl">
                The frontend development environment is active and configured according to{' '}
                <span className="font-mono font-medium text-slate-800">Design.md</span>. API proxy routing is
                mapped to <span className="font-mono font-medium text-slate-800">http://localhost:8000/api/v1</span>.
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Vite Toolchain Ready
              </span>
            </div>
          </div>

          {/* Quick Metrics Readiness Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Benchmark Freight Scenarios</span>
                <Server className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono mt-1">5</p>
              <p className="text-xs text-slate-500 mt-1">SHP-101 through SHP-105</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Evolus AI Credit Balance</span>
                <Bot className="w-4 h-4 text-violet-500" />
              </div>
              <p className="text-2xl font-bold text-violet-700 font-mono mt-1">50,000</p>
              <p className="text-xs text-slate-500 mt-1">Allocated for Hackathon</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Allowlisted Agent Tools</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono mt-1">6</p>
              <p className="text-xs text-slate-500 mt-1">Max 5 Recursions (RULE-E03)</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Human Approval Gating</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600 font-mono mt-1">ACTIVE</p>
              <p className="text-xs text-slate-500 mt-1">Consequential Tools Gated (RULE-E06)</p>
            </div>
          </div>
        </div>

        {/* Next Implementation Roadmap Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-blue-600" />
              Immediate Next Step: Unit 6.2 (Contracts & API Services)
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                <span>
                  Synchronize TypeScript interfaces in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">frontend/src/types/index.ts</code> directly with backend Pydantic models in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">backend/app/schemas/domain.py</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                <span>
                  Implement typed HTTP API client modules in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">frontend/src/services/</code> for Shipments, Exceptions, Approvals, and Copilot Chat.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-600" />
              Following Step: Unit 6.3 (Dashboard, Timeline & Chat)
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                <span>
                  Build interactive shipment table with risk level badges (<code className="font-mono text-red-600">CRITICAL</code>, <code className="font-mono text-amber-600">HIGH</code>, <code className="font-mono text-emerald-600">LOW</code>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                <span>
                  Build interactive milestone timeline, human approval modal, and Gemma 4 Copilot slide-over chat drawer.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
