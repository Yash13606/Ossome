"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Terminal, Activity, ChevronRight, FileText, Target, Zap, Waves } from "lucide-react"
import { cn } from "@/lib/utils"
import { SwarmVisualizer } from "./swarm-visualizer"
import { EnforcerOverlay } from "./enforcer-overlay"

type DashboardStep = 'SCAN' | 'PERSONA' | 'CONSENSUS' | 'REPORT'
const STEPS: DashboardStep[] = ['SCAN', 'PERSONA', 'CONSENSUS', 'REPORT']

export function PipelineDashboard() {
    const [currentStep, setCurrentStep] = React.useState<DashboardStep>('SCAN')
    const [mode, setMode] = React.useState<'STOCK_SCAN' | 'SIMULATION'>('STOCK_SCAN')
    const [activeSectors, setActiveSectors] = React.useState<string[]>([])
    const [results, setResults] = React.useState<Record<string, { verdict: 'bullish' | 'bearish' | 'neutral', conf: number, thought?: string }>>({})
    const [report, setReport] = React.useState<any>(null)
    const [logs, setLogs] = React.useState<{time: string, msg: string, type: 'sys' | 'ok' | 'err'}[]>([])
    const [isProcessing, setIsProcessing] = React.useState(false)
    
    // MiroFish-style Inputs
    const [seed, setSeed] = React.useState("")
    const [goal, setGoal] = React.useState("")
    const [selectedTicker, setSelectedTicker] = React.useState<string>("NVDA")
    const [customTicker, setCustomTicker] = React.useState("")
    
    const [stocks, setStocks] = React.useState<{symbol: string, name: string, industry: string}[]>([])
    const [isLoadingStocks, setIsLoadingStocks] = React.useState(true)
    const [macroSignals, setMacroSignals] = React.useState<{ticker: string, reasoning: string, priority: string}[]>([])
    const [history, setHistory] = React.useState<any[]>([])
    const [showHistory, setShowHistory] = React.useState(false)
    const [isEnforcing, setIsEnforcing] = React.useState(false)

    React.useEffect(() => {
        setIsLoadingStocks(true)
        Promise.all([
            fetch("http://localhost:8000/v1/stocks").then(r => r.json()),
            fetch("http://localhost:8000/v1/history").then(r => r.json()),
            fetch("http://localhost:8000/v1/macro/signals").then(r => r.json())
        ]).then(([stockData, historyData, macroData]) => {
            setStocks(stockData)
            setHistory(historyData)
            setMacroSignals(macroData)
            setIsLoadingStocks(false)
        }).catch(err => {
            console.error("Error fetching V4 data:", err)
            setIsLoadingStocks(false)
        })
    }, [])

    const addLog = (msg: string, type: 'sys' | 'ok' | 'err' = 'sys') => {
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false })
        setLogs(prev => [...prev, { time, msg, type }].slice(-50))
    }

    const startSimulation = async () => {
        if (isProcessing) return
        setIsProcessing(true)
        setResults({})
        setActiveSectors([])
        setReport(null)
        setLogs([])
        
        const finalTicker = customTicker.trim() || selectedTicker
        const finalGoal = goal.trim() || (mode === 'STOCK_SCAN' ? `Predict the market trajectory of ${finalTicker}` : "Predict scenario outcome.")
        const finalSeed = seed.trim() || (mode === 'STOCK_SCAN' ? `Market analysis for ${finalTicker}` : "Historical context provided.")

        addLog("SYSTEM_INITIALIZED // V4_AUTONOMOUS_LINK", 'ok')
        addLog(`MODE: ${mode} // GOAL: ${finalGoal.slice(0, 30)}...`, 'sys')

        const ws = new WebSocket("ws://localhost:8000/ws/swarm")

        ws.onopen = () => {
            ws.send(JSON.stringify({ 
                mode, 
                ticker: finalTicker, 
                seed: finalSeed, 
                goal: finalGoal 
            }))
            setCurrentStep('SCAN')
        }

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            
            switch (msg.type) {
                case 'STATUS':
                    addLog(msg.message, 'sys')
                    break
                
                case 'SCAN_COMPLETE':
                    const sectors = msg.data.relevant_sectors
                    setActiveSectors(sectors.map((s: string) => s.toLowerCase()))
                    addLog(`RELEVANT_SECTORS_IDENTIFIED: ${sectors.join(', ').toUpperCase()}`, 'ok')
                    setCurrentStep('PERSONA')
                    break

                case 'ANALYST_RESULT':
                    const analyst = msg.data
                    const sId = analyst.sector.toLowerCase()
                    setResults(prev => ({ 
                        ...prev, 
                        [sId]: { 
                            verdict: analyst.verdict.toLowerCase() as any, 
                            conf: analyst.confidence,
                            thought: analyst.thought
                        } 
                    }))
                    addLog(`ANALYST_${analyst.sector.toUpperCase()} // PHASE_COMPLETE`, analyst.verdict === 'BULLISH' ? 'ok' : 'err')
                    break

                case 'REPORT_COMPLETE':
                    addLog(`SIMULATION_SUCCESS // CONSENSUS_ARCHIVED`, 'ok')
                    setReport(msg.data)
                    setCurrentStep('REPORT')
                    fetch("http://localhost:8000/v1/history").then(r => r.json()).then(data => setHistory(data))
                    setIsProcessing(false)
                    ws.close()
                    break

                case 'ERROR':
                    addLog(`PIPELINE_ERROR: ${msg.message}`, 'err')
                    setIsProcessing(false)
                    ws.close()
                    break
            }
        }

        ws.onerror = () => {
            addLog(`SOCKET_ERROR: CONNECTION_FAILED`, 'err')
            setIsProcessing(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-mono flex flex-col selection:bg-flame selection:text-black relative overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b-2 border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-flame flex items-center justify-center font-black text-black">D</div>
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-black tracking-tighter uppercase">Devise_Command_Center</h1>
                        <p className="text-[10px] text-gray-500 uppercase">Ver: 1.2.0_Autonomous_V4</p>
                    </div>
                </div>

                <nav className="flex items-center gap-1 sm:gap-4">
                    {STEPS.map((step, idx) => (
                        <React.Fragment key={step}>
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 border-2 transition-all duration-300",
                                currentStep === step 
                                    ? "border-flame bg-flame/10 text-flame" 
                                    : "border-white/5 text-white/30"
                            )}>
                                <span className={cn(
                                    "text-[10px] font-black",
                                    currentStep === step ? "text-flame" : "text-white/20"
                                )}>0{idx + 1}</span>
                                <span className="text-xs font-bold tracking-widest hidden md:block">{step}</span>
                            </div>
                            {idx < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-white/10 hidden sm:block" />}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="px-4 py-2 border-2 border-white/10 hover:border-flame text-[10px] font-black uppercase transition-all"
                    >
                        [ History_Vault ]
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 border border-flame/30 bg-flame/5 rounded-full hidden lg:flex">
                        <Waves className="w-3 h-3 text-flame animate-pulse" />
                        <span className="text-[10px] text-flame font-bold uppercase tracking-widest">MiroFish_Engine_Link</span>
                    </div>
                </div>
            </header>

            {/* Macro Intel Bar */}
            <div className="h-10 bg-flame/5 border-b border-white/10 flex items-center px-6 gap-6 overflow-hidden relative">
                 <div className="flex items-center gap-2 shrink-0 border-r border-white/20 pr-6 bg-black h-full z-10">
                     <span className="text-[10px] font-black text-flame animate-pulse">MACRO_INTEL_STREAM</span>
                 </div>
                 <div className="flex gap-4 animate-marquee whitespace-nowrap">
                     {macroSignals.length > 0 ? (
                         [...macroSignals, ...macroSignals].map((sig, i) => (
                             <div key={i} className="flex items-center gap-4 text-[10px] px-4 border-r border-white/5">
                                 <span className="font-black text-white">{sig.ticker}</span>
                                 <span className={cn(
                                     "px-1.5 py-0.5 font-black rounded-sm border",
                                     sig.priority === 'HIGH' ? 'bg-flame border-flame text-black' : 'border-white/10 text-white/40'
                                 )}>
                                     {sig.priority}
                                 </span>
                                 <span className="text-white/40 italic">{sig.reasoning}</span>
                             </div>
                         ))
                     ) : (
                         <div className="text-[10px] text-white/20 font-black animate-pulse uppercase tracking-[0.2em] px-8">
                             INITIALIZING_AUTONOMOUS_GENESIS_SEQUENCE...
                         </div>
                     )}
                 </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-104px)]">
                {/* Left Panel: Visualization */}
                <section className="flex-1 border-r-2 border-white/10 relative p-0 flex flex-col overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0"
                         style={{ backgroundImage: `repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)`, backgroundSize: '20px 20px' }} 
                    />
                    
                    <div className="relative z-10 flex flex-col h-full uppercase p-8 px-12">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-black tracking-tighter flex items-center gap-3">
                                <Activity className="text-flame w-5 h-5" />
                                Swarm_Architect_V4
                            </h2>
                        </div>

                        <div className="flex-1 flex flex-col relative min-h-0 bg-black/40 border-4 border-white/5 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(0,0,0,1)]">
                             {/* Status Overlay */}
                             <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                                 <div className="flex items-center gap-3 px-3 py-1.5 bg-black/90 border border-white/10 backdrop-blur-md">
                                     <div className="flex items-center gap-2">
                                         <Zap className={cn("w-3 h-3 text-flame", isProcessing && "animate-pulse")} />
                                         <span className="text-[10px] font-black uppercase text-white/60">Logic_Density</span>
                                     </div>
                                     <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden flex">
                                         {Object.values(results).length > 0 ? (
                                             <>
                                                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(Object.values(results).filter(r => r.verdict === 'bullish').length / Object.values(results).length) * 100}%` }} />
                                                <div className="h-full bg-flame transition-all duration-500" style={{ width: `${(Object.values(results).filter(r => r.verdict === 'bearish').length / Object.values(results).length) * 100}%` }} />
                                             </>
                                         ) : <div className="h-full w-full bg-white/5" />}
                                     </div>
                                 </div>
                             </div>

                             <div className="flex-1 overflow-hidden relative grayscale-[0.2] opacity-80">
                                <SwarmVisualizer 
                                    currentStep={currentStep}
                                    activeSectors={activeSectors}
                                    results={results}
                                    ticker={customTicker.trim() || selectedTicker}
                                />
                             </div>

                            {/* Reasoning Terminal Overlay */}
                            <AnimatePresence>
                                {isProcessing && currentStep === 'PERSONA' && (
                                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-6 left-6 right-6 bg-black/95 border-2 border-white/20 p-5 backdrop-blur-3xl z-30 shadow-[0_20px_60px_rgba(0,0,0,1)]">
                                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                                            <div className="flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-flame" />
                                                <span className="text-[10px] font-black tracking-widest uppercase">Autonomous_Monologue // Parallel_Logic_Stream</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-[9px] text-white/40 uppercase">Nodes: {Object.keys(results).length}</div>
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {Object.entries(results).map(([sId, res]) => (
                                                <div key={sId} className="border border-white/5 p-3 h-20 overflow-y-auto bg-white/[0.02]">
                                                    <div className="text-[9px] font-black text-flame/80 mb-1 uppercase tracking-tighter">{sId}_UNIT</div>
                                                    <p className="text-[10px] text-white/50 leading-tight italic font-medium">{res.thought || "Syncing data streams..."}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* MiroFish Scenario Architect Overlay */}
                            <AnimatePresence>
                                {!isProcessing && currentStep === 'SCAN' && logs.length === 0 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-8 overflow-y-auto">
                                        <div className="flex flex-col items-center gap-8 text-center max-w-5xl w-full py-12">
                                            <div className="relative">
                                                <div className="w-16 h-16 border-2 border-flame/30 rounded-full flex items-center justify-center animate-spin-slow" />
                                                <div className="absolute inset-0 w-16 h-16 border-t-2 border-flame rounded-full animate-spin" />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <h2 className="text-6xl font-black text-white tracking-[0.2em] uppercase">Swarm_Genesis</h2>
                                                <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em]">Inject Seed Material // Define Prediction Goal</p>
                                            </div>

                                            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                                {/* Seed Material Input */}
                                                <div className="flex flex-col gap-4 text-left">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/20 tracking-widest px-2">
                                                        <FileText className="w-3 h-3 text-flame" /> 01 // SEED_SOURCE_MATERIAL
                                                    </div>
                                                    <textarea 
                                                        placeholder="PASTE_NEWS_ARTICLE_RAW_DATA_OR_SCENARIO_DESCRIPTION..."
                                                        value={seed}
                                                        onChange={(e) => setSeed(e.target.value)}
                                                        className="w-full h-64 bg-white/[0.02] border-2 border-white/10 p-6 text-xs text-white/60 font-medium focus:border-flame outline-none transition-all resize-none scrollbar-thin"
                                                    />
                                                </div>

                                                {/* Goal & Mode Selection */}
                                                <div className="flex flex-col gap-8 text-left">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/20 tracking-widest px-2">
                                                            <Target className="w-3 h-3 text-flame" /> 02 // PREDICTION_GOAL
                                                        </div>
                                                        <input 
                                                            type="text"
                                                            placeholder="DESCRIBE_EXACTLY_WHAT_YOU_WANT_TO_PREDICT..."
                                                            value={goal}
                                                            onChange={(e) => setGoal(e.target.value)}
                                                            className="w-full bg-white/[0.02] border-2 border-white/10 px-6 py-4 text-sm text-white font-black uppercase tracking-widest focus:border-flame outline-none transition-all"
                                                        />
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/20 tracking-widest px-2">
                                                            <Zap className="w-3 h-3 text-flame" /> 03 // ARCHITECTURE_MODE
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button onClick={() => setMode('STOCK_SCAN')} className={cn("py-4 border-2 text-[10px] font-black uppercase tracking-widest transition-all", mode === 'STOCK_SCAN' ? 'border-flame bg-flame/10 text-flame shadow-[0_0_30px_rgba(234,88,12,0.1)]' : 'border-white/5 text-white/20 hover:border-white/10')}>[ Market_Pulse ]</button>
                                                            <button onClick={() => setMode('SIMULATION')} className={cn("py-4 border-2 text-[10px] font-black uppercase tracking-widest transition-all", mode === 'SIMULATION' ? 'border-flame bg-flame/10 text-flame shadow-[0_0_30px_rgba(234,88,12,0.1)]' : 'border-white/5 text-white/20 hover:border-white/10')}>[ Auto_Sandbox ]</button>
                                                        </div>
                                                    </div>

                                                    {mode === 'STOCK_SCAN' && (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/20 tracking-widest px-2">
                                                                TICKER_IDENTIFIER
                                                            </div>
                                                            <input 
                                                                type="text"
                                                                placeholder="E.G. NVDA"
                                                                value={customTicker}
                                                                onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                                                                className="w-full bg-white/[0.02] border-2 border-white/10 px-6 py-3 text-2xl text-white font-black focus:border-flame outline-none"
                                                            />
                                                            
                                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[150px] overflow-y-auto p-4 border border-white/5 scrollbar-thin bg-black/20">
                                                                {isLoadingStocks ? (
                                                                    <div className="col-span-full py-4 text-white/20 animate-pulse text-[10px] font-black uppercase text-center">Synchronizing_Universe...</div>
                                                                ) : (
                                                                    stocks.map((s) => (
                                                                        <button
                                                                            key={s.symbol}
                                                                            onClick={() => { setSelectedTicker(s.symbol); setCustomTicker(""); }}
                                                                            className={cn(
                                                                                "p-2 border transition-all text-xs font-black",
                                                                                selectedTicker === s.symbol && !customTicker
                                                                                    ? "border-flame bg-flame/10 text-flame"
                                                                                    : "border-white/5 text-white/30 hover:border-white/10"
                                                                            )}
                                                                        >
                                                                            {s.symbol}
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button onClick={startSimulation} className="group relative px-24 py-8 bg-flame text-black font-black uppercase tracking-[0.8em] text-2xl transition-all hover:bg-white active:translate-y-1 overflow-hidden shadow-[0_0_100px_rgba(234,88,12,0.2)]">
                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                                [ Initialize_Swarm ]
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Final Report Overlay */}
                            <AnimatePresence>
                                {currentStep === 'REPORT' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-md">
                                        <div className="bg-black border-4 border-flame shadow-[30px_30px_0px_0px_#ea580c] p-12 max-w-2xl w-full relative">
                                            <div className="absolute -top-6 left-12 bg-flame text-black px-6 py-2 font-black text-xs uppercase tracking-widest">DEVISE_V4_AUTONOMOUS_REPORT</div>
                                            <div className="flex justify-between items-end mb-12 border-b-2 border-white/10 pb-8">
                                                <div>
                                                    <div className="text-[10px] text-white/40 font-black uppercase mb-2 tracking-widest">Simulation_Focus</div>
                                                    <div className="text-4xl font-black text-white">{report?.ticker !== "N/A" ? report?.ticker : "GENERAL_SANDBOX"}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-white/40 font-black uppercase mb-2 tracking-widest">Consensus_Action</div>
                                                    <div className={cn("text-4xl font-black", report?.action === 'BUY' ? "text-green-500" : "text-flame")}>{report?.action}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-8 mb-12">
                                                <div className="border border-white/10 p-4 bg-white/5">
                                                    <div className="text-[10px] text-white/40 font-black uppercase mb-1">Confidence_Score</div>
                                                    <div className="text-3xl font-black">{(report?.confidence_score * 100).toFixed(0)}%</div>
                                                </div>
                                                <div className="border border-white/10 p-4 bg-white/5">
                                                    <div className="text-[10px] text-white/40 font-black uppercase mb-1">Status</div>
                                                    <div className="text-3xl font-black text-green-500 uppercase">Success</div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-white/60 leading-relaxed mb-12 uppercase italic font-medium">{report?.consensus_reasoning}</p>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => { setCurrentStep('SCAN'); setLogs([]); setReport(null); }} 
                                                    className="bg-white/5 border-2 border-white/10 text-white/40 py-6 font-black uppercase tracking-[0.3em] text-sm hover:bg-white/10 hover:text-white transition-all"
                                                >
                                                    [ Return_To_Core ]
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setIsEnforcing(true);
                                                        addLog("ENFORCEMENT_PIPELINE_TRIGGERED", 'sys');
                                                        addLog("SCANNING_INTENT_PLAN // ARMORCLAW_V2", 'ok');
                                                        setTimeout(() => addLog(`VALIDATING_TICKER: ${report?.ticker}`, 'sys'), 1000);
                                                        setTimeout(() => addLog("ISSUING_DELEGATION_TOKEN // SECURE_HANDSHAKE", 'ok'), 2500);
                                                    }} 
                                                    className="bg-flame text-black py-6 font-black uppercase tracking-[0.3em] text-sm hover:bg-white transition-all shadow-[0_0_50px_rgba(234,88,12,0.3)]"
                                                >
                                                    [ Launch_Pipeline ]
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Enforcement Overlay */}
                            <EnforcerOverlay 
                                isOpen={isEnforcing} 
                                onClose={() => { 
                                    setIsEnforcing(false); 
                                    setCurrentStep('SCAN'); 
                                    setLogs([]); 
                                    setReport(null); 
                                }} 
                                report={report}
                                logs={logs}
                            />
                        </div>
                    </div>
                </section>

                {/* Right Panel: Audit Log */}
                <aside className="w-full lg:w-[450px] bg-[#050505] flex flex-col border-t-2 lg:border-t-0 border-white/10 relative">
                    <div className="h-12 border-b border-white/10 flex items-center px-6 bg-[#0a0a0a] justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-500 tracking-widest uppercase">
                            <Terminal className="w-3 h-3 text-flame" /> SYS_SIMULATION_AUDIT
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[10px] leading-relaxed selection:bg-white selection:text-black scrollbar-thin">
                        <AnimatePresence initial={false}>
                            {logs.map((log, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
                                    <span className="text-white/20 select-none">[{log.time}]</span>
                                    <div className={cn("flex-1 break-all uppercase tracking-tighter", log.type === 'sys' ? "text-white/60" : log.type === 'ok' ? "text-green-400 font-bold" : "text-flame font-bold")}>{log.msg}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    <div className="h-10 border-t border-white/10 bg-[#080808] flex items-center px-4 justify-between text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">
                        <div>Buffer_V4: Active</div>
                        <div className="animate-pulse text-green-500">Node_Stable</div>
                    </div>
                </aside>
            </main>

            {/* History Vault Sidebar */}
            <AnimatePresence>
                {showHistory && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-[450px] bg-[#080808] border-l-4 border-flame z-[101] shadow-[-20px_0_100px_rgba(0,0,0,1)] flex flex-col">
                            <div className="p-8 border-b-2 border-white/10 flex justify-between items-center bg-[#050505]">
                                <h3 className="text-2xl font-black uppercase tracking-tighter">History_Vault</h3>
                                <button onClick={() => setShowHistory(false)} className="text-[10px] font-black text-white/40 hover:text-white uppercase">[ Close ]</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/40 scrollbar-thin">
                                {history.length > 0 ? history.map((item) => (
                                    <div key={item.id} className="border-2 border-white/5 p-5 hover:border-flame/40 transition-all cursor-pointer group bg-white/5 backdrop-blur-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-2xl font-black text-white group-hover:text-flame transition-colors">{item.report.ticker === "N/A" ? "SANDBOX" : item.report.ticker}</span>
                                            <span className="text-[10px] text-white/20 font-black">{item.timestamp}</span>
                                        </div>
                                        <div className="text-[10px] font-black uppercase text-flame mb-4 px-2 py-1 bg-flame/10 border border-flame/20 inline-block">Verdict: {item.report.action}</div>
                                        <p className="text-[10px] text-white/40 leading-relaxed line-clamp-3 uppercase font-medium">{item.report.consensus_reasoning}</p>
                                    </div>
                                )) : <div className="py-20 text-center text-white/10 font-black uppercase text-sm">No_Historical_Archive</div>}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}


