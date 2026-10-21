// C.O.R.A.L. Workspace Tab 1: Cortex Studio
(() => {
window.CORAL = window.CORAL || {};

const {
    Target, Brain, Zap, Scissors, Activity, Repeat, Palette, GitMerge,
    Waves, Layers, Shuffle, Crosshair,
    TIERS, MAX_VOCAB, ARC_PALETTE, VOCAB_SLOT_LABELS, VOCAB_SLOT_DIGITS,
    getPixelColor, SignalFlowViz, MultiBlockViz, AttentionViz
} = window.CORAL;

const StudioWorkspace = ({
    uiState,
    updateState,
    telemetry,
    progress,
    vLoss,
    retentionMap,
    setupTier,
    handleManualGrowth,
    handleSleep,
    handleSetPonderSteps,
    handleSetReadoutMode,
    handleGrowVocab,
    handleSetManifoldMode,
    blendConfig,
    setBlendConfig,
    probeInput,
    selectedToken,
    setSelectedToken,
    tokenAttentionMap,
    snapshots,
    handleSelectVizBlock,
    handleRandomizeProbe,
    handleClearProbe,
    expectedTarget,
    selectedTokenVocabProbs,
    handlePixelClick
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 grow">
            <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col shadow-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-400 flex items-center gap-2"><Target size={14} className="text-amber-500"/> MULTI-TASK CURRICULUM ({uiState.gridSize}x{uiState.gridSize})</h3>
                    <span className="text-[10px] font-mono text-sky-400">Token [TASK_{uiState.tier}]</span>
                </div>
                <div className="space-y-1.5 overflow-y-auto max-h-[600px] pr-1">
                    {TIERS.map(t => {
                        const retention = retentionMap[t.id];
                        return (
                            <div key={t.id} onClick={() => setupTier(t.id, true)} className={`cursor-pointer p-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${uiState.tier === t.id ? 'bg-amber-950/30 border-amber-500/50 text-amber-100 shadow-sm' : uiState.tier > t.id ? 'bg-emerald-950/15 border-emerald-900/40 text-emerald-400' : 'bg-gray-900/40 border-gray-800/40 text-gray-500 hover:bg-gray-900'}`}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">T{t.id}: {t.name}</span>
                                        <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono ${t.type === 'Custom' ? 'bg-pink-900/40 text-pink-300 border border-pink-500/30' : t.type === 'Logic' ? 'bg-amber-900/30 text-amber-400' : 'bg-sky-900/30 text-sky-400'}`}>{t.type}</span>
                                        {retention !== undefined && (
                                            <span className={`text-[8px] font-mono px-1 py-0.2 rounded border ${retention >= 80 ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300' : retention >= 55 ? 'bg-amber-950 border-amber-500/40 text-amber-300' : 'bg-rose-950 border-rose-500/50 text-rose-300 font-bold'}`} title="Task Retention %">
                                                {retention}% Ret
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] opacity-60 mt-0.5">{t.desc}</div>
                                </div>
                                {uiState.tier === t.id && <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"/>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="lg:col-span-2 space-y-4 flex flex-col">
                {/* COMPACT STUDIO MASTERY & NEUROGENESIS RIBBON */}
                <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3 grow min-w-[200px]">
                        <span className="text-[11px] font-bold text-gray-300 shrink-0 flex items-center gap-1.5">
                            <Brain size={13} className="text-emerald-400"/>
                            T{uiState.tier} MASTERY:
                        </span>
                        <div className="w-full max-w-[200px] h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                            <div className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-400 transition-all duration-300" style={{ width: `${progress}%` }}/>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">{Math.round(progress)}%</span>
                        <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">(VAL: {Number(vLoss || 0).toFixed(4)})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button onClick={handleManualGrowth} className="px-2.5 py-1 bg-emerald-950/35 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all" title="Zero-Shock Neurogenesis">
                            <Zap size={11}/> +GROW ({uiState.chunkSize}N)
                        </button>
                        <button onClick={handleSleep} className="px-2.5 py-1 bg-sky-950/35 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all" title="Gradient-Protected Sleep Pruning">
                            <Scissors size={11}/> SLEEP
                        </button>
                        <button onClick={() => updateState({ mainTab: 'telemetry' })} className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all">
                            <Activity size={11}/> FULL GRAPHS
                        </button>
                    </div>
                </div>

                {/* PONDERING, DYNAMIC VOCABULARY READOUT & LATENT BLEND ROW */}
                <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-3.5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 shadow-lg">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                            <Repeat size={13} className="text-sky-400"/>
                            <span className="text-[11px] font-bold text-gray-300">PONDER:</span>
                        </div>
                        <div className="flex gap-1 bg-black/60 p-1 rounded-xl border border-gray-800">
                            {[1, 2, 3, 4].map(k => (
                                <button
                                    key={k}
                                    onClick={() => handleSetPonderSteps(k)}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all ${uiState.ponderSteps === k ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                    title={`Universal Transformer: ${k} recurrent pass${k > 1 ? 'es' : ''}`}
                                >
                                    {k}x{k > 1 ? `(${k * (telemetry.layers || 1)}L)` : ''}
                                </button>
                            ))}
                        </div>

                        <div className="h-4 w-[1px] bg-gray-800 hidden sm:block"></div>

                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-gray-800">
                            <button
                                onClick={() => handleSetReadoutMode('scalar')}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all ${uiState.readoutMode === 'scalar' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50' : 'text-gray-400 hover:text-white'}`}
                                title="1D Continuous Regression Head"
                            >
                                SCALAR (1D)
                            </button>
                            <button
                                onClick={() => handleSetReadoutMode('vocab')}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all ${uiState.readoutMode === 'vocab' ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50' : 'text-gray-400 hover:text-white'}`}
                                title="Expanding Categorical Vocabulary Cortex"
                            >
                                VOCAB ({uiState.activeVocab}/10)
                            </button>
                            {uiState.readoutMode === 'vocab' && uiState.activeVocab < MAX_VOCAB && (
                                <button
                                    onClick={() => handleGrowVocab(2)}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 transition-all"
                                    title="Zero-Shock Vocabulary Neurogenesis: Unlock +2 Symbol Classes"
                                >
                                    +2 V
                                </button>
                            )}
                        </div>

                        <div className="h-4 w-[1px] bg-gray-800 hidden sm:block"></div>

                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-gray-800">
                            <button
                                onClick={() => handleSetManifoldMode('2d')}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${uiState.manifoldMode === '2d' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50' : 'text-gray-400 hover:text-white'}`}
                                title="2D Axial Spatial RoPE Manifold"
                            >
                                2D GRID
                            </button>
                            <button
                                onClick={() => handleSetManifoldMode('1d')}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${uiState.manifoldMode === '1d' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50' : 'text-gray-400 hover:text-white'}`}
                                title="1D Sequential RoPE Manifold"
                            >
                                1D SEQ
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => updateState({ colorMode: uiState.colorMode === 'arc' ? 'gray' : 'arc' })}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all ${uiState.colorMode === 'arc' ? 'bg-fuchsia-950/50 border-fuchsia-500/50 text-fuchsia-300' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'}`}
                            title="Toggle between ARC-AGI 10-Color Symbolic Palette and Grayscale"
                        >
                            <Palette size={12}/> {uiState.colorMode === 'arc' ? 'ARC-10 PALETTE' : 'GRAYSCALE'}
                        </button>

                        <button 
                            onClick={() => setBlendConfig(p => ({ ...p, enabled: !p.enabled }))}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all ${blendConfig.enabled ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-300 shadow' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'}`}
                        >
                            <GitMerge size={12}/> {blendConfig.enabled ? 'BLEND: ON' : 'TASK BLEND'}
                        </button>
                        {blendConfig.enabled && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-mono text-[10px] text-amber-300">T{uiState.tier} ({Math.round((1-blendConfig.alpha)*100)}%)</span>
                                <div className="w-16">
                                    <input 
                                        type="range" min="0" max="1" step="0.05" 
                                        value={blendConfig.alpha} 
                                        onChange={(e) => setBlendConfig(p => ({ ...p, alpha: parseFloat(e.target.value) }))} 
                                    />
                                </div>
                                <select 
                                    value={blendConfig.secondaryTier}
                                    onChange={(e) => setBlendConfig(p => ({ ...p, secondaryTier: parseInt(e.target.value) }))}
                                    className="bg-gray-900 border border-gray-700 text-sky-300 rounded-lg px-2 py-0.5 text-[10px] font-mono"
                                >
                                    {TIERS.map(t => (
                                        <option key={t.id} value={t.id}>T{t.id}: {t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col grow justify-between shadow-lg">
                    <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                        <div className="flex gap-2">
                            <button onClick={() => updateState({ vizMode: 'flow' })} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${uiState.vizMode==='flow' ? 'bg-gray-800 text-white border-gray-600' : 'text-gray-500 border-transparent hover:text-gray-300'}`}><Waves size={13}/> RESIDUAL STREAM</button>
                            <button onClick={() => updateState({ vizMode: 'weights' })} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${uiState.vizMode==='weights' ? 'bg-gray-800 text-white border-gray-600' : 'text-gray-500 border-transparent hover:text-gray-300'}`}><Layers size={13}/> SYNAPTIC WEIGHTS</button>
                            <button onClick={() => updateState({ vizMode: 'attention' })} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${uiState.vizMode==='attention' ? 'bg-gray-800 text-white border-gray-600' : 'text-gray-500 border-transparent hover:text-gray-300'}`}><Activity size={13}/> 2D ATTENTION MAPS</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleRandomizeProbe} className="text-[10px] px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 flex items-center gap-1 transition-all"><Shuffle size={10}/> Random</button>
                            <button onClick={handleClearProbe} className="text-[10px] px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-lg border border-gray-800 transition-all">Clear</button>
                        </div>
                    </div>

                    <div className="w-full bg-[#030305] border border-gray-900 rounded-xl overflow-hidden flex flex-col xl:flex-row gap-4 p-3 items-center justify-between shadow-inner">
                        <div className="flex flex-col gap-1.5 items-center shrink-0">
                            <div className="text-[9px] text-gray-400 font-mono font-bold tracking-wider flex items-center gap-1">
                                <Crosshair size={10} className="text-sky-400"/> PROBE INPUT (CLICK/FOCUS)
                            </div>
                            <div className="grid gap-1 p-1 bg-gray-950 rounded-xl border border-gray-800" style={{ gridTemplateColumns: `repeat(${uiState.gridSize}, minmax(0, 1fr))`, width: '106px', height: '106px' }}>
                                {probeInput.map((val, idx) => {
                                    const isFocus = selectedToken === idx;
                                    const attnScore = tokenAttentionMap ? tokenAttentionMap[idx] : 0;
                                    const baseColor = getPixelColor(val, uiState.colorMode);
                                    const digit = Math.min(9, Math.max(0, Math.round(val)));
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => handlePixelClick(idx)} 
                                            onMouseEnter={() => {
                                                if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
                                                    setSelectedToken(idx);
                                                }
                                            }}
                                            className={`cursor-pointer transition-all duration-75 border rounded-[3px] relative flex items-center justify-center ${isFocus ? 'border-sky-400 ring-1 ring-sky-400/60 z-10' : 'border-gray-800/80 hover:border-gray-600'}`} 
                                            style={{ 
                                                backgroundColor: baseColor,
                                                boxShadow: attnScore > 0.08 ? `inset 0 0 6px rgba(255, 90, 50, ${Math.min(0.95, attnScore * 2.5)})` : 'none'
                                            }}
                                            title={`Pixel #${idx} | Sym ${digit} (Attention: ${(attnScore*100).toFixed(1)}%)`}
                                        >
                                            {uiState.colorMode === 'arc' && uiState.gridSize <= 6 && digit > 0 && (
                                                <span className="text-[8px] font-mono font-black text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{digit}</span>
                                            )}
                                            {isFocus && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-sky-300 rounded-full animate-ping"/>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="w-full h-[140px] relative bg-[#060609] rounded-xl border border-gray-900 overflow-hidden flex items-center justify-center grow shadow-inner">
                            {snapshots && (
                                uiState.vizMode === 'weights' ? <MultiBlockViz blocks={snapshots.blocks} rows={snapshots.rows} cols={uiState.configSize} /> : 
                                uiState.vizMode === 'attention' ? <AttentionViz attentionData={snapshots.attention} activeBlockIndex={uiState.vizBlockIndex} setBlockIndex={handleSelectVizBlock} selectedPixel={selectedToken} /> :
                                <SignalFlowViz residuals={snapshots.residuals} />
                            )}
                        </div>

                        <div className="flex gap-3 items-center shrink-0">
                            <div className="flex flex-col gap-1.5 items-center">
                                <div className="text-[9px] text-emerald-400 font-mono font-bold tracking-wider">PREDICTION</div>
                                <div className="grid gap-1 p-1 bg-gray-950 rounded-xl border border-emerald-950/70" style={{ gridTemplateColumns: `repeat(${uiState.gridSize}, minmax(0, 1fr))`, width: '106px', height: '106px' }}>
                                    {snapshots && snapshots.prediction ? Array.from(snapshots.prediction).map((val, idx) => { 
                                        const v = Math.max(0, Math.min(10, val * 10)); 
                                        const digit = Math.min(9, Math.max(0, Math.round(v)));
                                        const isFocus = selectedToken === idx;
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => setSelectedToken(idx)}
                                                className={`cursor-pointer border rounded-[3px] transition-colors duration-75 flex items-center justify-center ${isFocus ? 'border-sky-400' : 'border-gray-800/80'}`} 
                                                style={{ backgroundColor: getPixelColor(v, uiState.colorMode) }}
                                                title={`Predicted Pixel #${idx}: ${v.toFixed(2)} (Sym ${digit})`}
                                            >
                                                {uiState.colorMode === 'arc' && uiState.gridSize <= 6 && digit > 0 && (
                                                    <span className="text-[8px] font-mono font-black text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{digit}</span>
                                                )}
                                            </div>
                                        );
                                    }) : <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-700">Wait</div>}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 items-center">
                                <div className="text-[9px] text-amber-400/90 font-mono font-bold tracking-wider">
                                    {blendConfig.enabled ? 'BLENDED TARGET' : 'GROUND TRUTH'}
                                </div>
                                <div className="grid gap-1 p-1 bg-gray-950 rounded-xl border border-amber-950/70" style={{ gridTemplateColumns: `repeat(${uiState.gridSize}, minmax(0, 1fr))`, width: '106px', height: '106px' }}>
                                    {expectedTarget.map((val, idx) => { 
                                        const v = Math.max(0, Math.min(10, val)); 
                                        const digit = Math.min(9, Math.max(0, Math.round(v)));
                                        return (
                                            <div 
                                                key={idx} 
                                                className="border border-gray-800/80 rounded-[3px] transition-colors duration-75 flex items-center justify-center" 
                                                style={{ backgroundColor: getPixelColor(v, uiState.colorMode) }}
                                                title={`Target Pixel #${idx}: ${v.toFixed(1)} (Sym ${digit})`}
                                            >
                                                {uiState.colorMode === 'arc' && uiState.gridSize <= 6 && digit > 0 && (
                                                    <span className="text-[8px] font-mono font-black text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{digit}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {uiState.readoutMode === 'vocab' && selectedTokenVocabProbs && (
                        <div className="mt-3 p-2.5 bg-[#050509] border border-purple-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <div className="text-[10px] font-mono text-purple-300 font-bold shrink-0 flex items-center gap-1.5">
                                <Palette size={12} className="text-purple-400"/>
                                <span>TOKEN #{selectedToken} SYMBOL SOFTMAX ({uiState.activeVocab} ACTIVE CLASSES):</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 md:flex md:flex-wrap items-center gap-1.5 w-full justify-end">
                                {selectedTokenVocabProbs.map((item) => {
                                    const pct = Math.round(item.prob * 100);
                                    return (
                                        <div key={item.slot} className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-800 px-2 py-1 rounded-lg min-w-[78px]">
                                            <span className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20" style={{ backgroundColor: item.color }} />
                                            <div className="flex flex-col grow">
                                                <div className="flex justify-between text-[9px] font-mono leading-none">
                                                    <span className="text-gray-300 font-bold">{item.label}</span>
                                                    <span className={pct > 40 ? "text-emerald-400 font-bold" : "text-gray-400"}>{pct}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-black rounded-full overflow-hidden mt-1">
                                                    <div className="h-full transition-all duration-150" style={{ width: `${pct}%`, backgroundColor: item.color === '#0b0b12' ? '#6b7280' : item.color }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

window.CORAL.StudioWorkspace = StudioWorkspace;
})();
