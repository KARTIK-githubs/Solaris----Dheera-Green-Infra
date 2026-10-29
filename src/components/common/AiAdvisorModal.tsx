import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useApp } from '../../context/AppContext';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: any;
  defaultPrompt?: string;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  onClose,
  initialContext,
  defaultPrompt
}) => {
  const { aiMessages, setAiMessages, workspaceMode, currentUser } = useApp();
  const [prompt, setPrompt] = useState(defaultPrompt || '');
  const [loading, setLoading] = useState(false);
  const [isLiveModelActive, setIsLiveModelActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (defaultPrompt && prompt === '') {
      setPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      role: 'user' as const,
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await apiClient.askAssistant(textToSend.trim(), {
        ...initialContext,
        workspaceMode,
        customerName: currentUser.name,
        systemCapacityKw: 6.8
      });
      if (res.success && res.data) {
        setIsLiveModelActive(res.data.isLiveModel);
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.reply,
            isLiveModel: res.data.isLiveModel,
            fallbackReason: res.data.fallbackReason,
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `[Service Notice] Unable to process request: ${res.error || 'Server error'}. Solaris deterministic calculators remain active.`,
            isLiveModel: false,
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `[Connection Notice] Assistant endpoint unreachable (${err.message}). Deterministic solar engines and persisted MongoDB data remain active.`,
          isLiveModel: false,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const customerChips = [
    { label: 'Monthly Generation', text: 'How much energy did my system generate this month?' },
    { label: 'Bill Savings', text: 'How much money did I save on my electricity bill?' },
    { label: 'System Health', text: 'Is my solar system working properly?' },
    { label: 'Maintenance Request', text: 'How do I request maintenance or panel cleaning?' }
  ];

  const employeeChips = [
    { label: 'Canonical Solar Yield', text: 'Explain the canonical solar yield formulation and derating factor.' },
    { label: 'Feasibility & Shortfall', text: 'Explain how the solver evaluates financial feasibility and calculates capital shortfall.' },
    { label: 'DERC VNM Guidelines', text: 'What are the statutory requirements under DERC Virtual Net Metering Guidelines 2024?' },
    { label: 'Synthetic Telemetry', text: 'Explain the simulated telemetry parameters and hardware streaming disclosure.' }
  ];

  const quickChips = workspaceMode === 'customer' ? customerChips : employeeChips;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#fbfbf9] rounded-2xl shadow-2xl border border-[#cbd2ca] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#f4f5f0] border-b border-[#cbd2ca] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#002620] text-[#9af4d8] flex items-center justify-center font-bold shadow-sm">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-sm font-bold text-[#002620] tracking-tight">
                  {workspaceMode === 'customer' ? 'Dheera Green Solar Assistant' : 'Solaris Technical & Regulatory Advisory'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                  isLiveModelActive === true
                    ? 'bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
                    : 'bg-[#ffeed9] text-[#b45309] border border-[#fde68a]'
                }`}>
                  {isLiveModelActive === true ? '● Groq (gpt-oss-20b)' : '○ Offline Rule Engine'}
                </span>
              </div>
              <p className="text-[11px] text-[#404846]">
                {workspaceMode === 'customer' ? 'Your rooftop solar performance, savings & maintenance assistant' : 'Delhi Electricity Regulatory Commission (DERC) VNM 2024 & Sizing Advisory'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#404846] hover:bg-[#e2e7e0] transition-colors"
            aria-label="Close Advisory"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mandatory Regulatory & Synthetic Disclosure */}
        <div className="bg-[#fffbeb] border-b border-[#fde68a] px-4 py-2 text-[11px] text-[#92400e] flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5 text-[#b45309]">info</span>
          <div>
            <span className="font-bold font-mono tracking-wider text-[10px] uppercase">
              {workspaceMode === 'customer' ? '[SOLAR COMPANION ADVISORY]: ' : '[ILLUSTRATIVE PLANNING ADVISORY]: '}
            </span>
            {workspaceMode === 'customer'
              ? 'Estimated figures are derived from your 6.8 kWp canonical rooftop yield and Delhi DERC slabs. Displayed telemetry is simulated demonstration data. For on-site repairs or inverter inspections, submit a maintenance ticket via the support tab.'
              : 'Advisory estimates are generated for planning simulations under DERC VNM 2024. All participants, CA numbers, and telemetry feeds are synthetic demo data. Outputs do not constitute official DISCOM filings or certified structural approvals.'}
          </div>
        </div>

        {/* Quick Query Chips */}
        <div className="px-4 py-2 bg-[#f4f5f0]/50 border-b border-[#cbd2ca]/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#707975] shrink-0 font-bold">Quick Inquiries:</span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.text)}
              disabled={loading}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-[#e8ece5] border border-[#cbd2ca] text-[#002620] whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[#fbfbf9]">
          {aiMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] font-mono font-bold text-[#707975]">
                  {msg.role === 'user' ? (workspaceMode === 'customer' ? (currentUser.name || 'Customer') : 'Engineering Operator') : (workspaceMode === 'customer' ? 'Dheera Green Assistant' : 'Solaris Advisory Engine')}
                </span>
                <span className="text-[10px] text-[#a0aaa5] font-mono">{msg.timestamp}</span>
                {msg.role === 'assistant' && msg.fallbackReason && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#f0f2ed] text-[#555f5b] border border-[#dce2da]">
                    {msg.fallbackReason === 'NO_API_KEY' ? 'Key Unset' : msg.fallbackReason}
                  </span>
                )}
              </div>

              <div
                className={`max-w-[92%] rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap font-sans ${
                  msg.role === 'user'
                    ? 'bg-[#002620] text-[#fbfbf9] shadow-sm'
                    : 'bg-white text-[#1a231f] border border-[#cbd2ca] shadow-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 text-[#006b57] text-xs font-mono py-2 px-1">
              <span className="w-2 h-2 rounded-full bg-[#006b57] animate-ping"></span>
              <span>Consulting advisory engine & evaluating deterministic constraints...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#f4f5f0] border-t border-[#cbd2ca] flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={workspaceMode === 'customer' ? 'Ask about solar generation, savings, system health, or maintenance...' : 'Ask about DERC VNM 2024, canonical yield, shortfall, or sizing...'}
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#cbd2ca] bg-white text-xs text-[#002620] placeholder-[#707975] focus:outline-none focus:ring-1 focus:ring-[#006b57] focus:border-[#006b57]"
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || !prompt.trim()}
            className="px-4 py-2.5 rounded-lg bg-[#002620] hover:bg-[#003d34] disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
