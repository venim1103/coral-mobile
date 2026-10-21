// C.O.R.A.L. Workspace Tab 2: Telemetry & Neurogenesis Deck
(() => {
window.CORAL = window.CORAL || {};

const {
    Brain, Zap, Scissors, Palette, Layers, Shield, Eye,
    TIERS, MAX_VOCAB, GeneralizationChart, CapacityEvolutionChart
} = window.CORAL;

const TelemetryWorkspace = ({
    uiState,
    currentTier,
    progress,
    vLoss,
    telemetry,
    snapshots,
    gameState,
    retentionMap,
    handleManualGrowth,
    handleSleep,
    handleGrowVocab,
    handleResetGraph,
    handleSweepAllRetention,
    setupTier
}) => {
    return (
        <div className="space-y-5 flex flex-col grow">
            {/* ROW 1: TASK MASTERY & ZERO-SHOCK NEUROGENESIS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                <Brain size={15} className="text-emerald-400"/> TASK MASTERY — T{uiState.tier}: {currentTier.name.toUpperCase()}
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">{currentTier.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${currentTier.type==='Logic'?'border-amber-500/40 text-amber-400 bg-amber-950/30':'border-sky-500/40 text-sky-400 bg-sky-950/30'}`}>
                                {currentTier.type.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono text-sky-300 bg-gray-900 px-2.5 py-0.5 rounded border border-gray-800 font-bold">
                                {uiState.status}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                            <div className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-400 transition-all duration-300" style={{ width: `${progress}%` }}/>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>Evo Threshold: &lt;{uiState.evoThreshold}</span>
                            <span>Live Val Loss: <b className="text-amber-300">{Number(vLoss || 0).toFixed(4)}</b></span>
                            <span className="text-emerald-400 font-bold">Mastery: {Math.round(progress)}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                            <Zap size={15} className="text-amber-400"/> ZERO-SHOCK NEUROGENESIS &amp; MYELINATION
                        </h3>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {uiState.activeNeurons}N ({uiState.consolidatedNeurons}🔒) / {uiState.maxPossibleNeurons} Max
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden mb-3 border border-gray-800 flex">
                        <div className="h-full bg-sky-400 transition-all duration-300" title="Myelinated/Consolidated Neurons" style={{ width: `${Math.min(100, (uiState.consolidatedNeurons / Math.max(1, uiState.maxPossibleNeurons)) * 100)}%` }} />
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300" title="Plastic Active Neurons" style={{ width: `${Math.min(100, ((uiState.activeNeurons - uiState.consolidatedNeurons) / Math.max(1, uiState.maxPossibleNeurons)) * 100)}%` }} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button onClick={handleManualGrowth} className="w-full py-2 bg-emerald-950/35 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                            <Zap size={13}/> GROW (+{uiState.chunkSize}N)
                        </button>
                        <button onClick={handleSleep} className="w-full py-2 bg-sky-950/35 hover:bg-sky-900/50 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                            <Scissors size={13}/> SLEEP (PRUNE)
                        </button>
                        <button onClick={() => handleGrowVocab(2)} disabled={uiState.activeVocab >= MAX_VOCAB} className="col-span-2 sm:col-span-1 w-full py-2 bg-purple-950/35 hover:bg-purple-900/50 disabled:opacity-40 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                            <Palette size={13}/> +2 VOCAB ({uiState.activeVocab}/10)
                        </button>
                    </div>
                </div>
            </div>

            {/* ROW 2: REAL-TIME DUAL TELEMETRY CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GeneralizationChart 
                    trainData={gameState.current.trainHistory} 
                    valData={gameState.current.valHistory} 
                    threshold={uiState.evoThreshold} 
                    step={uiState.step} 
                    onReset={handleResetGraph}
                />
                <CapacityEvolutionChart 
                    neuronData={gameState.current.neuronHistory} 
                    consolidatedData={gameState.current.consolidatedHistory} 
                    maxCapacity={uiState.maxPossibleNeurons} 
                    step={uiState.step}
                />
            </div>

            {/* ROW 3: PER-LAYER CORTICAL ANATOMY & 20-TIER CONTINUAL RETENTION MATRIX */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 grow">
                <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                <Layers size={14} className="text-cyan-400"/> CORTICAL LAYER ANATOMY
                            </h3>
                            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                                {telemetry.layers}L &times; {uiState.ponderSteps} Ponder = {telemetry.layers * uiState.ponderSteps}L Eff
                            </span>
                        </div>
                        <div className="space-y-2.5">
                            {snapshots && snapshots.blocks ? snapshots.blocks.map((blk, idx) => {
                                const pctFF = Math.round((blk.activeFF / uiState.configSize) * 100);
                                const pctLock = Math.round(((blk.consolidated || 0) / uiState.configSize) * 100);
                                return (
                                    <div key={idx} className="p-2.5 bg-gray-900/70 rounded-xl border border-gray-800 space-y-1.5">
                                        <div className="flex justify-between items-center text-[11px] font-mono">
                                            <span className="text-white font-bold">{blk.label} Cortex Block</span>
                                            <span className="text-sky-300">{blk.activeHeads}/{uiState.maxHeads} Heads • {blk.activeFF}/{uiState.configSize}N ({blk.consolidated || 0}🔒)</span>
                                        </div>
                                        <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-gray-800 flex">
                                            <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${pctLock}%` }} title="Myelinated Neurons" />
                                            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.max(0, pctFF - pctLock)}%` }} title="Plastic Active Neurons" />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-xs text-gray-600 py-6 text-center">Syncing layer telemetry...</div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[10px] font-mono text-gray-400">
                        <span>Readout: <b className="text-purple-300">{uiState.readoutMode.toUpperCase()}</b></span>
                        <span>dModel: <b className="text-emerald-300">{uiState.dModel}</b></span>
                        <span>RoPE: <b className="text-amber-300">{uiState.manifoldMode === '1d' ? '1D Linear' : '2D Axial'}</b></span>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                    <div>
                        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                            <div>
                                <h3 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                    <Shield size={14} className="text-emerald-400"/> 21-TIER CONTINUAL RETENTION MATRIX ([TASK_ID] MEMORY)
                                </h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Click any tier cell below to switch the active training curriculum without leaving the Telemetry Deck.</p>
                            </div>
                            <button 
                                onClick={handleSweepAllRetention}
                                className="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all"
                            >
                                <Eye size={12}/> SWEEP ALL 21 TIERS NOW
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {TIERS.map(t => {
                                const ret = retentionMap[t.id];
                                const isCurrent = uiState.tier === t.id;
                                return (
                                    <div 
                                        key={t.id} 
                                        onClick={() => setupTier(t.id, true)}
                                        className={`cursor-pointer p-2.5 rounded-xl border transition-all flex flex-col justify-between ${isCurrent ? 'bg-amber-950/35 border-amber-500/60 shadow-md' : ret !== undefined && ret >= 80 ? 'bg-emerald-950/20 border-emerald-800/50 hover:bg-emerald-950/35' : 'bg-gray-900/50 border-gray-800/70 hover:bg-gray-900'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-amber-300' : 'text-gray-300'}`}>T{t.id}</span>
                                            <span className={`text-[8px] px-1 rounded font-mono ${t.type === 'Logic' ? 'bg-amber-900/30 text-amber-400' : 'bg-sky-900/30 text-sky-400'}`}>{t.type}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-200 truncate my-1" title={t.name}>{t.name}</div>
                                        <div className="flex items-center justify-between text-[9px] font-mono">
                                            <span className="text-gray-500">Ret:</span>
                                            <span className={ret === undefined ? 'text-gray-600' : ret >= 80 ? 'text-emerald-400 font-bold' : ret >= 55 ? 'text-amber-400' : 'text-rose-400 font-bold'}>
                                                {ret !== undefined ? `${ret}%` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.CORAL.TelemetryWorkspace = TelemetryWorkspace;
})();
