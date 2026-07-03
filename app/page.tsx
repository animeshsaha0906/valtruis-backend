'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CompanyInsight {
  name: string;
  sector: string;
  alignment: number;
  valuation: number;
  sentiment: string;
  description: string;
  why_invest: string;
  key_metrics: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data: CompanyInsight = payload[0].payload;
    return (
      <div className="pointer-events-none bg-slate-900 text-white p-4 rounded-lg shadow-xl border border-slate-700 max-w-sm text-xs border-l-4 border-l-emerald-400 z-50">
        <p className="font-bold text-sm mb-1">{data.name}</p>
        <p className="text-slate-400 font-medium mb-2">{data.sector}</p>
        <p className="mb-2"><span className="text-slate-400">Predictive Valuation:</span> ${data.valuation}M</p>
        <p className="text-slate-300 leading-relaxed"><span className="text-emerald-400 font-semibold">Thesis:</span> {data.why_invest}</p>
      </div>
    );
  }
  return null;
};

export default function ValtruisDashboard() {
  const [filter, setFilter] = useState('All');
  const [portfolioData, setPortfolioData] = useState<CompanyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat Interface State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: "I am the Valtruis AI Analyst Co-Pilot. Ask me to break down any target startup's VBC risk model, valuation trajectory, or clinical alignment strategy." }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('https://valtruis-backend.onrender.com/api/companies')
    
      .then((res) => {
        if (!res.ok) throw new Error('Failed response from backend');
        return res.json();
      })
      .then((data) => {
        if (data && data.companies && data.companies.length > 0) {
          setPortfolioData(data.companies);
        } else {
          throw new Error('Backend returned an empty target universe matrix.');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to the backend pipeline. Ensure Uvicorn is active on port 8000.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('https://valtruis-backend.onrender.com/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Network pipeline timeout. Verify your FastAPI local terminal instance." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center text-slate-600 font-medium">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-950 mb-4"></div>
        <p className="tracking-wide text-sm font-semibold text-slate-800">Synthesizing Target Watchlist with Live News Streams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-6 rounded-xl border border-red-200 max-w-md shadow-sm">
          <p className="text-red-600 font-semibold mb-2">Pipeline Execution Interrupted</p>
          <p className="text-slate-500 text-xs mb-4 leading-relaxed">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors">Retry Handshake</button>
        </div>
      </div>
    );
  }

  const filteredData = filter === 'All' ? portfolioData : portfolioData.filter(d => d.sector === filter);
  const sectors = ['All', ...Array.from(new Set(portfolioData.map(d => d.sector)))];

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans antialiased relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Block */}
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Valtruis Analytics Engine</h1>
            <p className="text-slate-500 text-sm mt-1">Real-Time Predictive Modeling & Thesis Mapping</p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-md border border-emerald-200 flex items-center gap-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Predictive Streams Active
          </div>
        </header>

        {/* Matrix Visualization */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Target Alignment Matrix</h2>
              <p className="text-slate-400 text-xs mt-0.5">Hover over node matrices to stream predictive investment structures</p>
            </div>
            <select 
              className="p-2 border border-slate-200 rounded-md bg-white text-xs font-medium outline-none focus:ring-1 focus:ring-slate-400"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 15, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" dataKey="alignment" name="VBC Alignment" domain={[65, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Downside Risk Alignment Score ➔', position: 'insideBottomRight', offset: -10, fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                <YAxis type="number" dataKey="valuation" name="Valuation" domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Predictive 24M Valuation ($M) ➔', angle: -90, position: 'insideLeft', offset: 15, fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                <Scatter data={filteredData}>
                  {filteredData.map((entry, idx) => (
                    <Cell 
                      key={idx} 
                      className="cursor-pointer transition-colors duration-200" 
                      fill={entry.sentiment === 'Positive' ? '#10b981' : entry.sentiment === 'Negative' ? '#ef4444' : '#f59e0b'} 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map(company => (
            <div key={company.name} className="group relative bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-slate-400 transition-all duration-300 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 transition-colors">{company.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{company.sector}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                    company.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>{company.sentiment}</span>
                </div>
                
                <p className="text-slate-400 font-mono text-[11px] font-semibold mb-3">{company.key_metrics}</p>
                <p className="text-slate-600 text-xs leading-relaxed mb-6">{company.description}</p>
              </div>

              {/* Hover-reveal Overlay Slide: Insights Deep Dive */}
              <div className="absolute inset-0 bg-slate-950 p-6 text-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex flex-col justify-between z-10">
                <div>
                  <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Investment Thesis</h4>
                  <p className="text-slate-200 text-xs leading-relaxed font-normal">{company.why_invest}</p>
                </div>
                <div className="border-t border-slate-800 pt-3 flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Risk Vector: {company.alignment}/100</span>
                  <span>Proj. Cap: ${company.valuation}M</span>
                </div>
              </div>

              <div className="flex justify-between text-xs font-bold border-t border-slate-100 pt-4 bg-white relative z-0">
                <span className="text-slate-500">Alignment: <span className="text-slate-800 font-mono">{company.alignment}%</span></span>
                <span className="text-slate-500">Target Cap: <span className="text-slate-800 font-mono">${company.valuation}M</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Chat Interface Container */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 transition-transform hover:scale-105 flex items-center justify-center focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
          </button>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-80 md:w-96 flex flex-col overflow-hidden h-[460px] transition-all duration-200">
            {/* Chat Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>Valtruis AI Co-Pilot</h3>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white focus:outline-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            {/* Chat History Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`max-w-[85%] p-2.5 rounded-lg text-xs leading-relaxed ${msg.role === 'ai' ? 'bg-white border border-slate-200 text-slate-700 self-start' : 'bg-slate-900 text-white self-end'}`}>
                  {msg.text}
                </div>
              ))}
              {isChatLoading && (
                <div className="bg-white border border-slate-200 text-slate-400 self-start p-2 rounded-lg text-xs font-mono flex gap-1">
                  <span>Synthesizing matrix data</span><span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Submission Block */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask regarding alignment vectors..." 
                className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40">
                Query
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}