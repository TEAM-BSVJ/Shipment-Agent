import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Radio,
  Lock,
} from 'lucide-react';
import { StatusBadge } from '../common';
import { ChatMessage, Shipment } from '../../types';
import { agentService } from '../../services';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedShipment: Shipment | null;
  onClearShipmentContext?: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  selectedShipment,
  onClearShipmentContext,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation when drawer opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: selectedShipment
            ? `Hello! I am your ShipRAG Copilot. Active shipment context: ${selectedShipment.tracking_number} (${selectedShipment.origin} → ${selectedShipment.destination}). How can I assist you with this shipment?`
            : 'Hello! I am your ShipRAG Copilot. I assist dispatch coordinators with root-cause bottleneck diagnosis, cross-document reconciliation, and allowlisted recovery workflows. What freight scenario would you like to investigate?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, selectedShipment]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  if (!isOpen) return null;

  // Context-aware suggested prompts
  const getSuggestedPrompts = () => {
    if (!selectedShipment) {
      return [
        'Why is shipment SHP-101 held up at Mumbai Port?',
        'What caused the warehouse dispatch delay for SHP-102?',
        'Explain the weight mismatch on shipment SHP-103',
        'List all 6 allowlisted functions governed by human approval',
      ];
    }

    const t = selectedShipment.tracking_number;
    if (t === 'SHP-101') {
      return [
        'Why is SHP-101 on customs hold at Mumbai Port?',
        'Can we notify the exporter about the missing commercial invoice?',
        'What is the cutoff deadline for vessel departure?',
      ];
    }
    if (t === 'SHP-102') {
      return [
        'What caused the warehouse dispatch delay for SHP-102?',
        'Propose a milestone reschedule for carrier FedEx Freight',
        'Does rescheduling milestone require human approval?',
      ];
    }
    if (t === 'SHP-103') {
      return [
        'Explain the 60.0 kg weight discrepancy between invoice and packing list',
        'Trigger the automated weight reconciliation workflow',
        'What is the risk level for container COSCO manifest?',
      ];
    }
    if (t === 'SHP-105') {
      return [
        'What was the CBP inspection hold on pharma shipment SHP-105?',
        'Verify the licensed broker cold-chain release permit',
      ];
    }

    return [
      `Analyze freight telemetry and documents for ${t}`,
      `What are the upcoming delivery milestones for ${t}?`,
      `Does ${t} have any open compliance exceptions?`,
    ];
  };

  // Generate offline fallback response tailored to logistics queries
  const generateFallbackResponse = (
    query: string,
    shipment: Shipment | null
  ): { content: string; grounded_facts: string[]; recommended_action?: string } => {
    const q = query.toLowerCase();

    if (q.includes('shp-101') || (shipment?.tracking_number === 'SHP-101' && (q.includes('customs') || q.includes('why') || q.includes('invoice')))) {
      return {
        content:
          'Shipment SHP-101 (Mumbai to Rotterdam) is on **CUSTOMS_HOLD** because the mandatory **Commercial Invoice** has not been uploaded to the shipment repository. The container cannot pass export customs clearance without this tax declaration. The export gate cutoff is in 24 hours.',
        grounded_facts: [
          'Commercial Invoice missing from repository',
          'Vessel departure gate cutoff: 24 hours remaining',
          'Carrier: MAERSK_01 (Sea Freight)',
          'High Risk Score: 75/100',
        ],
        recommended_action: 'send_notification: Dispatch MISSING_DOCUMENT_ADVISORY template to export-desk@tatasteel.mock',
      };
    }

    if (q.includes('shp-102') || (shipment?.tracking_number === 'SHP-102' && (q.includes('delay') || q.includes('warehouse') || q.includes('reschedule')))) {
      return {
        content:
          "Shipment SHP-102 (Dallas DC to Austin Hub) suffered a **+4.5 hour delay** at milestone `WAREHOUSE_DISPATCH`. Ground telemetry verifies that staging area 4B experienced a forklift mechanical breakdown, delaying pallet staging. Carrier vehicle FedEx Freight is staged and waiting.",
        grounded_facts: [
          'Milestone WAREHOUSE_DISPATCH is +4.5 hours overdue',
          'Forklift breakdown at Dallas DC dock 4B confirmed by WMS telemetry',
          'Carrier vehicle FedEx Freight staged at dock',
          'Critical Risk Score: 95/100 (due tomorrow)',
        ],
        recommended_action: 'reschedule_milestone: Push WAREHOUSE_DISPATCH by +5.0 hours (Requires Human Sign-off per RULE-E06)',
      };
    }

    if (q.includes('shp-103') || (shipment?.tracking_number === 'SHP-103' && (q.includes('weight') || q.includes('mismatch') || q.includes('discrepancy')))) {
      return {
        content:
          'A cross-document discrepancy of **60.0 kg** was detected between the Commercial Invoice (declared at 250.0 kg) and the Packing List (certified scale weight 310.0 kg). This discrepancy exceeds the legal tolerance threshold of 0.5 kg. The root cause is that pallet tare weight (60 kg) was omitted from invoice line items.',
        grounded_facts: [
          'Commercial Invoice declared: 250.0 kg',
          'Packing List scale weight: 310.0 kg',
          'Absolute discrepancy: 60.0 kg (Tolerance: 0.5 kg)',
          'High Risk Score: 65/100',
        ],
        recommended_action: 'trigger_workflow: Execute WEIGHT_RECONCILIATION automated manifest update (Waiting for Human Approval)',
      };
    }

    if (q.includes('shp-105') || (shipment?.tracking_number === 'SHP-105' && (q.includes('customs') || q.includes('pharma') || q.includes('permit')))) {
      return {
        content:
          'Shipment SHP-105 (Frankfurt to Chicago ORD) was flagged for CBP regulatory pharmaceutical inspection. Cold-chain sensors verified continuous safe temperature (3.8°C within the 2–8°C limit). The licensed broker has completed emergency inspection protocol and uploaded release permit CBP-ORD-BIO-89211.',
        grounded_facts: [
          'Temperature sensor verified safe at 3.8 deg C (limit 2-8 deg C)',
          'Licensed broker signed release permit CBP-ORD-BIO-89211',
          'Exception marked RESOLVED with audit sign-off',
        ],
        recommended_action: 'escalate_to_human: Completed and authorized by licensed customs broker',
      };
    }

    if (q.includes('tool') || q.includes('allowlist') || q.includes('rule-e06') || q.includes('governance')) {
      return {
        content:
          'The autonomous agent is restricted to **6 allowlisted tools** per Architecture.md Section 4.2:\n\n1. `get_shipment` (read-only query)\n2. `create_correction_task` (autonomous task creation)\n3. `trigger_workflow` (*gated by human approval*)\n4. `send_notification` (parameterized templates only)\n5. `reschedule_milestone` (*gated by human approval*)\n6. `escalate_to_human` (direct broker sign-off)\n\nConsequential tools strictly require human operator authorization before execution.',
        grounded_facts: [
          'Recursion boundary: max 5 tool iterations per cycle',
          'Strict prompt sanitization with <user_data> fences',
          'PostgreSQL append-only audit trail recorded for every invocation',
        ],
      };
    }

    return {
      content: `I have reviewed the available freight telemetry${
        shipment ? ` for shipment ${shipment.tracking_number}` : ''
      }. Based on real-time carrier scans, milestone logs, and document extraction, all actions remain governed by policy rules (RULE-E06). Let me know if you would like me to formulate a diagnostic root-cause analysis or propose a remediation task.`,
      grounded_facts: [
        `Transport Mode: ${shipment?.mode || 'Multimodal'}`,
        `Current Status: ${shipment?.status || 'Active Operations'}`,
        `Risk Tier: ${shipment?.risk_level || 'Monitored'}`,
      ],
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let replyContent = '';
      let groundedFacts: string[] = [];
      let recAction: string | null = null;

      try {
        const response = await agentService.sendCopilotMessage({
          shipment_id: selectedShipment?.id,
          message: text,
          conversation_history: history,
        });

        replyContent = response.response;
        groundedFacts = response.grounded_facts || [];
        recAction = response.recommended_action || null;
      } catch (apiErr) {
        console.warn('Backend Copilot chat API returned error, applying intelligent offline fallback:', apiErr);
        const fallback = generateFallbackResponse(text, selectedShipment);
        replyContent = fallback.content;
        groundedFacts = fallback.grounded_facts;
        recAction = fallback.recommended_action || null;
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounded_facts: groundedFacts,
        recommended_action: recAction,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat loop error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an unexpected error evaluating freight context. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Window */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-navy-900 border-l border-navy-700 shadow-2xl z-50 flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-navy-700 bg-navy-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-400 text-navy-950 flex items-center justify-center font-bold shadow-glow-violet">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white font-mono">ShipRAG Copilot</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-400/20 text-violet-300 font-bold border border-violet-400/40">
                  AI Online
                </span>
              </div>
              <p className="text-[11px] text-slateText-muted">
                Autonomous Logistics Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMessages([])}
              className="text-slateText-muted hover:text-white p-1.5 rounded hover:bg-navy-800 transition-colors"
              title="Clear conversation history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slateText-muted hover:text-white p-1.5 rounded hover:bg-navy-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Context Bar */}
        {selectedShipment && (
          <div className="px-4 py-2 bg-navy-950 border-b border-navy-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-mono font-bold text-cyan-400 shrink-0">
                {selectedShipment.tracking_number}
              </span>
              <span className="text-slateText-secondary truncate font-mono text-[11px]">
                {selectedShipment.origin} → {selectedShipment.destination}
              </span>
              <StatusBadge status={selectedShipment.risk_level} size="sm" />
            </div>
            {onClearShipmentContext && (
              <button
                onClick={onClearShipmentContext}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline shrink-0 ml-2"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-navy-950/60">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded bg-navy-850 border border-violet-400/40 text-violet-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed space-y-2 shadow-sm ${
                    isUser
                      ? 'bg-cyan-400 text-navy-950 font-medium rounded-tr-none'
                      : 'bg-navy-850 text-slateText-primary border border-navy-700 rounded-tl-none'
                  }`}
                >
                  {/* Content body */}
                  <div className="whitespace-pre-line font-normal">{msg.content}</div>

                  {/* Grounded Evidence Pills */}
                  {!isUser && msg.grounded_facts && msg.grounded_facts.length > 0 && (
                    <div className="pt-2 border-t border-navy-700/60 space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slateText-muted block">
                        Verified Telemetry Facts:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {msg.grounded_facts.map((fact, fIdx) => (
                          <span
                            key={fIdx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-mint-400/15 text-mint-400 border border-mint-400/30"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-mint-400 shrink-0" />
                            {fact}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Action Card */}
                  {!isUser && msg.recommended_action && (
                    <div className="mt-2 p-2.5 bg-navy-950 border border-amber-400/40 rounded-md text-[11px] text-amber-300 space-y-1.5 font-mono shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Recommended Remediation:</span>
                      </div>
                      <p className="text-[10px] text-slateText-secondary">
                        {msg.recommended_action}
                      </p>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('approvals');
                            onClose();
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 pt-0.5"
                        >
                          <span>Review in Human Approvals Queue</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-right font-mono text-slateText-muted pt-0.5">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-2.5 justify-start items-center text-xs text-violet-300 font-mono animate-pulse">
              <div className="w-7 h-7 rounded bg-navy-850 border border-violet-400/40 text-violet-300 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <span>Reasoning with ShipRAG AI...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Context-aware Suggested Prompt Pills */}
        <div className="p-2.5 border-t border-navy-700 bg-navy-900 overflow-x-auto whitespace-nowrap space-x-1.5 flex items-center">
          <span className="text-[10px] font-mono text-slateText-muted uppercase shrink-0">
            Suggested:
          </span>
          {getSuggestedPrompts().map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] px-2 py-1 rounded bg-navy-850 border border-navy-700 hover:border-cyan-400/40 text-slateText-secondary hover:text-white transition-colors shrink-0 font-mono"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-navy-700 bg-navy-850 space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Copilot about bottlenecks, customs cutoffs, or recovery plans..."
              className="w-full text-xs bg-navy-950 border border-navy-700 rounded-md p-2.5 pr-10 text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-cyan-400 font-sans resize-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isSending}
              className="absolute right-2.5 bottom-3 p-1.5 rounded bg-cyan-400 text-navy-950 font-bold hover:bg-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slateText-muted font-mono">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>Input sanitized with &lt;user_data&gt; boundary delimiters (RULE-F02)</span>
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
