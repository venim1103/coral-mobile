// C.O.R.A.L. Workspace Tab 3: Custom Task Sandbox (Tier 21)
(() => {
window.CORAL = window.CORAL || {};

const {
    Palette, Play, Layers,
    ARC_PALETTE, getPixelColor, fitGridToSize, evalCustomTarget
} = window.CORAL;

const SandboxWorkspace = ({
    uiState,
    customSandbox,
    updateCustomSandbox,
    handleActivateAndTrainSandbox,
    isPaintingRef,
    handlePaintSandboxCell,
    snapshots,
    refreshSandboxDatasetsIfActive,
    handleSetManifoldMode,
    showToast,
    setProbeInput
}) => {
    const gSize = uiState.gridSize;
    const len = gSize * gSize;
    const activeIdx = Math.max(0, Math.min(customSandbox.pairs.length - 1, customSandbox.activePairIdx || 0));
    const curPair = customSandbox.pairs[activeIdx] || { name: 'Pair #1', input: new Array(len).fill(0), target: new Array(len).fill(0) };
    const inGrid = fitGridToSize(curPair.input, len);
    const tgtGrid = customSandbox.mode === 'pairs'
        ? fitGridToSize(curPair.target, len)
        : evalCustomTarget(inGrid, gSize, customSandbox);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 grow">
            {/* LEFT 2 COLUMNS: INTERACTIVE DUAL PAINTER & LIVE PREDICTION PREVIEW */}
            <div className="lg:col-span-2 bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-800/80 pb-3">
                    <div>
                        <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
                            <Palette size={15} className="text-pink-400"/> INTERACTIVE FEW-SHOT SANDBOX DESIGNER — TIER 21 ([TASK_21])
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            Paint custom Input &rarr; Target ARC-style grid pairs or select an algorithmic preset. C.O.R.A.L. encodes your rule into token <span className="font-mono text-pink-300">[TASK_21]</span>.
                        </p>
                    </div>
                    <button
                        onClick={handleActivateAndTrainSandbox}
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all"
                    >
                        <Play size={13}/> ACTIVATE &amp; TRAIN TIER 21
                    </button>
                </div>

                {/* 10-SYMBOL ARC BRUSH BAR */}
                <div className="p-3 bg-[#050509] rounded-xl border border-gray-800/90 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-gray-300 flex items-center gap-1.5">
                        <Palette size={12} className="text-amber-400"/> ARC-10 SYMBOL BRUSH:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(sym => {
                            const active = customSandbox.brushSymbol === sym;
                            return (
                                <button
                                    key={sym}
                                    onClick={() => updateCustomSandbox({ brushSymbol: sym })}
                                    className={`w-7 h-7 rounded-lg font-mono text-xs font-black flex items-center justify-center transition-all border ${active ? 'ring-2 ring-white border-white scale-110 z-10' : 'border-gray-700 opacity-80 hover:opacity-100'}`}
                                    style={{ backgroundColor: ARC_PALETTE[sym], color: sym === 4 || sym === 5 || sym === 8 ? '#000' : '#fff' }}
                                    title={`Select Symbol ${sym}`}
                                >
                                    {sym}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* THREE SIDE-BY-SIDE N x N GRIDS: INPUT PAINTER, TARGET PAINTER, LIVE PREDICTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center justify-items-center bg-[#040407] p-4 rounded-2xl border border-gray-900 shadow-inner">
                    {/* 1. PAINT INPUT GRID */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-[10px] font-mono font-bold text-sky-400 tracking-wider">
                            1. PAINT INPUT ({curPair.name || `PAIR #${activeIdx + 1}`})
                        </div>
                        <div
                            className="grid gap-1 p-1.5 bg-gray-950 rounded-xl border border-sky-900/60 shadow select-none"
                            style={{ gridTemplateColumns: `repeat(${gSize}, minmax(0, 1fr))`, width: '148px', height: '148px', touchAction: 'none' }}
                            onPointerLeave={() => { isPaintingRef.current = false; }}
                            onPointerUp={() => { isPaintingRef.current = false; }}
                        >
                            {inGrid.map((val, idx) => {
                                const digit = Math.min(9, Math.max(0, Math.round(val)));
                                return (
                                    <div
                                        key={idx}
                                        onPointerDown={(e) => { 
                                            isPaintingRef.current = true; 
                                            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
                                            handlePaintSandboxCell('input', idx); 
                                        }}
                                        onPointerEnter={(e) => { 
                                            if (isPaintingRef.current || e.buttons === 1) handlePaintSandboxCell('input', idx); 
                                        }}
                                        className="cursor-crosshair border border-gray-800/80 hover:border-sky-400 rounded-[4px] flex items-center justify-center transition-colors touch-none"
                                        style={{ backgroundColor: getPixelColor(digit, uiState.colorMode) }}
                                    >
                                        {uiState.colorMode === 'arc' && gSize <= 6 && digit > 0 && (
                                            <span className="text-[9px] font-mono font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{digit}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. PAINT TARGET GRID */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">
                            2. {customSandbox.mode === 'pairs' ? 'PAINT DESIRED TARGET' : `PRESET TARGET (${customSandbox.mode.replace('preset_', '').toUpperCase()})`}
                        </div>
                        <div
                            className="grid gap-1 p-1.5 bg-gray-950 rounded-xl border border-amber-900/60 shadow select-none"
                            style={{ gridTemplateColumns: `repeat(${gSize}, minmax(0, 1fr))`, width: '148px', height: '148px', touchAction: 'none' }}
                            onPointerLeave={() => { isPaintingRef.current = false; }}
                            onPointerUp={() => { isPaintingRef.current = false; }}
                        >
                            {tgtGrid.map((val, idx) => {
                                const digit = Math.min(9, Math.max(0, Math.round(val)));
                                return (
                                    <div
                                        key={idx}
                                        onPointerDown={(e) => { 
                                            isPaintingRef.current = true; 
                                            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
                                            handlePaintSandboxCell('target', idx); 
                                        }}
                                        onPointerEnter={(e) => { 
                                            if (isPaintingRef.current || e.buttons === 1) handlePaintSandboxCell('target', idx); 
                                        }}
                                        className="cursor-crosshair border border-gray-800/80 hover:border-amber-400 rounded-[4px] flex items-center justify-center transition-colors touch-none"
                                        style={{ backgroundColor: getPixelColor(digit, uiState.colorMode) }}
                                    >
                                        {uiState.colorMode === 'arc' && gSize <= 6 && digit > 0 && (
                                            <span className="text-[9px] font-mono font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{digit}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. LIVE CORTEX PREDICTION GRID */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">
                            3. LIVE CORTEX PREDICTION (T{uiState.tier})
                        </div>
                        <div
                            className="grid gap-1 p-1.5 bg-gray-950 rounded-xl border border-emerald-900/60 shadow"
                            style={{ gridTemplateColumns: `repeat(${gSize}, minmax(0, 1fr))`, width: '148px', height: '148px' }}
                        >
                            {snapshots && snapshots.prediction ? Array.from(snapshots.prediction).map((val, idx) => {
                                const v = Math.max(0, Math.min(10, val * 10));
                                const digit = Math.min(9, Math.max(0, Math.round(v)));
                                return (
                                    <div
                                        key={idx}
                                        className="border border-gray-800/80 rounded-[4px] flex items-center justify-center transition-colors"
                                        style={{ backgroundColor: getPixelColor(v, uiState.colorMode) }}
                                        title={`Predicted: ${v.toFixed(2)} (Sym ${digit})`}
                                    >
                                        {uiState.colorMode === 'arc' && gSize <= 6 && digit > 0 && (
                                            <span className="text-[9px] font-mono font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{digit}</span>
                                        )}
                                    </div>
                                );
                            }) : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">Waiting...</div>}
                        </div>
                    </div>
                </div>

                {/* QUICK PAINTER TRANSFORM TOOLS */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800/80">
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            onClick={() => {
                                updateCustomSandbox(prev => {
                                    const pairs = [...prev.pairs];
                                    const idx = Math.max(0, Math.min(pairs.length - 1, prev.activePairIdx || 0));
                                    const p = { ...pairs[idx] };
                                    p.target = [...fitGridToSize(p.input, len)];
                                    pairs[idx] = p;
                                    const next = { ...prev, mode: 'pairs', pairs };
                                    refreshSandboxDatasetsIfActive(next);
                                    return next;
                                });
                                showToast("Copied Input -> Target");
                            }}
                            className="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl text-[10px] font-mono font-bold text-gray-200 transition-all"
                        >
                            Copy Input &rarr; Target
                        </button>
                        <button
                            onClick={() => {
                                updateCustomSandbox(prev => {
                                    const pairs = [...prev.pairs];
                                    const idx = Math.max(0, Math.min(pairs.length - 1, prev.activePairIdx || 0));
                                    const p = { ...pairs[idx] };
                                    const src = fitGridToSize(p.target, len);
                                    const shifted = new Array(len).fill(0);
                                    for (let r = 0; r < gSize; r++) {
                                        for (let c = 0; c < gSize; c++) {
                                            shifted[r * gSize + c] = src[r * gSize + (c > 0 ? c - 1 : gSize - 1)];
                                        }
                                    }
                                    p.target = shifted;
                                    pairs[idx] = p;
                                    const next = { ...prev, mode: 'pairs', pairs };
                                    refreshSandboxDatasetsIfActive(next);
                                    return next;
                                });
                                showToast("Shifted Target Right by 1 Col");
                            }}
                            className="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl text-[10px] font-mono font-bold text-sky-300 transition-all"
                        >
                            Shift Target Right
                        </button>
                        <button
                            onClick={() => {
                                updateCustomSandbox(prev => {
                                    const pairs = [...prev.pairs];
                                    const idx = Math.max(0, Math.min(pairs.length - 1, prev.activePairIdx || 0));
                                    const p = { ...pairs[idx] };
                                    p.target = fitGridToSize(p.target, len).map(v => 9 - Math.min(9, Math.max(0, Math.round(v))));
                                    pairs[idx] = p;
                                    const next = { ...prev, mode: 'pairs', pairs };
                                    refreshSandboxDatasetsIfActive(next);
                                    return next;
                                });
                                showToast("Inverted Target Symbols (9 - x)");
                            }}
                            className="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl text-[10px] font-mono font-bold text-amber-300 transition-all"
                        >
                            Invert Target (9-x)
                        </button>
                        <button
                            onClick={() => {
                                updateCustomSandbox(prev => {
                                    const pairs = [...prev.pairs];
                                    const idx = Math.max(0, Math.min(pairs.length - 1, prev.activePairIdx || 0));
                                    pairs[idx] = { ...pairs[idx], input: new Array(len).fill(0), target: new Array(len).fill(0) };
                                    const next = { ...prev, mode: 'pairs', pairs };
                                    refreshSandboxDatasetsIfActive(next);
                                    return next;
                                });
                                showToast("Cleared Active Pair Grids");
                            }}
                            className="px-2.5 py-1.5 bg-gray-900 hover:bg-red-950/40 border border-gray-800 hover:border-red-800 rounded-xl text-[10px] font-mono font-bold text-gray-400 hover:text-red-300 transition-all"
                        >
                            Clear Pair
                        </button>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">
                        Tip: Drag across cells to paint continuously
                    </span>
                </div>
            </div>

            {/* RIGHT COLUMN: FEW-SHOT EXAMPLE BANK, AUGMENTERS & ALGORITHMIC PRESETS */}
            <div className="bg-[#08080c] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg space-y-4">
                <div className="space-y-4">
                    {/* FEW-SHOT PAIR BANK */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                <Layers size={13} className="text-amber-400"/> FEW-SHOT EXAMPLE BANK ({customSandbox.pairs.length}/8)
                            </h4>
                            <div className="flex gap-1">
                                <button
                                    disabled={customSandbox.pairs.length >= 8}
                                    onClick={() => {
                                        updateCustomSandbox(prev => {
                                            if (prev.pairs.length >= 8) return prev;
                                            const newIdx = prev.pairs.length;
                                            const nextPairs = [...prev.pairs, { name: `Pair #${newIdx + 1}`, input: new Array(len).fill(0), target: new Array(len).fill(0) }];
                                            const next = { ...prev, mode: 'pairs', activePairIdx: newIdx, pairs: nextPairs };
                                            refreshSandboxDatasetsIfActive(next);
                                            return next;
                                        });
                                    }}
                                    className="px-2 py-0.5 bg-emerald-950/50 hover:bg-emerald-900/60 disabled:opacity-40 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-mono font-bold"
                                >
                                    + Add Pair
                                </button>
                                <button
                                    disabled={customSandbox.pairs.length <= 1}
                                    onClick={() => {
                                        updateCustomSandbox(prev => {
                                            if (prev.pairs.length <= 1) return prev;
                                            const idx = Math.max(0, Math.min(prev.pairs.length - 1, prev.activePairIdx || 0));
                                            const nextPairs = prev.pairs.filter((_, i) => i !== idx);
                                            const next = { ...prev, activePairIdx: Math.max(0, idx - 1), pairs: nextPairs };
                                            refreshSandboxDatasetsIfActive(next);
                                            return next;
                                        });
                                    }}
                                    className="px-2 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-40 border border-rose-500/40 text-rose-300 rounded-lg text-[10px] font-mono font-bold"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {customSandbox.pairs.map((p, idx) => {
                                const isSel = customSandbox.activePairIdx === idx && customSandbox.mode === 'pairs';
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            updateCustomSandbox({ mode: 'pairs', activePairIdx: idx });
                                            setProbeInput(fitGridToSize(p.input, len));
                                        }}
                                        className={`p-2 rounded-xl border text-left font-mono text-[10px] transition-all flex justify-between items-center ${isSel ? 'bg-pink-950/40 border-pink-500/60 text-pink-200 font-bold shadow' : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200'}`}
                                    >
                                        <span className="truncate">#{idx + 1}: {p.name || `Example ${idx + 1}`}</span>
                                        {isSel && <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* INVARIANCE AUGMENTERS & MANIFOLD SWITCHER */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 space-y-2.5">
                        <div className="text-[10px] font-mono font-bold text-sky-300 uppercase tracking-wider">
                            Generalization Augmenters &amp; RoPE Manifold
                        </div>
                        <button
                            onClick={() => {
                                updateCustomSandbox(prev => {
                                    const next = { ...prev, augColorPermute: !prev.augColorPermute };
                                    refreshSandboxDatasetsIfActive(next);
                                    return next;
                                });
                            }}
                            className={`w-full p-2 rounded-xl border text-left text-[11px] flex justify-between items-center transition-all ${customSandbox.augColorPermute ? 'bg-purple-950/35 border-purple-500/50 text-purple-200 font-bold' : 'bg-black/40 border-gray-800 text-gray-500'}`}
                        >
                            <span>Symbol Color Permutation (&pi;(1..9))</span>
                            <span className="font-mono text-[10px]">{customSandbox.augColorPermute ? 'ON' : 'OFF'}</span>
                        </button>
                        <button
                            onClick={() => {
                                updateCustomSandbox(prev => {
                                    const next = { ...prev, augSpatialShift: !prev.augSpatialShift };
                                    refreshSandboxDatasetsIfActive(next);
                                    return next;
                                });
                            }}
                            className={`w-full p-2 rounded-xl border text-left text-[11px] flex justify-between items-center transition-all ${customSandbox.augSpatialShift ? 'bg-emerald-950/35 border-emerald-500/50 text-emerald-200 font-bold' : 'bg-black/40 border-gray-800 text-gray-500'}`}
                        >
                            <span>Toroidal Spatial Shift (dr, dc)</span>
                            <span className="font-mono text-[10px]">{customSandbox.augSpatialShift ? 'ON' : 'OFF'}</span>
                        </button>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                                onClick={() => handleSetManifoldMode('2d')}
                                className={`py-1.5 rounded-xl border text-[10px] font-mono font-bold transition-all ${uiState.manifoldMode === '2d' ? 'bg-amber-500/25 border-amber-500/50 text-amber-300' : 'bg-black/40 border-gray-800 text-gray-400'}`}
                            >
                                2D Spatial RoPE
                            </button>
                            <button
                                onClick={() => handleSetManifoldMode('1d')}
                                className={`py-1.5 rounded-xl border text-[10px] font-mono font-bold transition-all ${uiState.manifoldMode === '1d' ? 'bg-cyan-500/25 border-cyan-500/50 text-cyan-300' : 'bg-black/40 border-gray-800 text-gray-400'}`}
                            >
                                1D Sequence RoPE
                            </button>
                        </div>
                    </div>

                    {/* ALGORITHMIC RULE PRESETS */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 space-y-2">
                        <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                            One-Click Tier 21 Rule Presets
                        </div>
                        {[
                            { id: 'pairs', label: 'Interactive Few-Shot Pairs', desc: 'Trains on your painted Input -> Target examples above.' },
                            { id: 'preset_rot90', label: '90° Clockwise Matrix Rotation', desc: 'Global 2D spatial transpose + column reversal.' },
                            { id: 'preset_rule110', label: '1D Rule 110 Cellular Automaton', desc: 'Turing-complete 1D elementary automaton (try 1D RoPE!).' },
                            { id: 'preset_swap', label: 'Symbolic Color Swap (1↔2, 3↔4, 8↔9)', desc: 'Bijective non-linear symbol permutation.' }
                        ].map(preset => {
                            const active = customSandbox.mode === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        updateCustomSandbox(prev => {
                                            const next = { ...prev, mode: preset.id };
                                            refreshSandboxDatasetsIfActive(next);
                                            return next;
                                        });
                                        if (preset.id === 'preset_rule110') handleSetManifoldMode('1d');
                                        showToast(`Tier 21 Mode: ${preset.label}`);
                                    }}
                                    className={`w-full p-2 rounded-xl border text-left transition-all ${active ? 'bg-amber-950/40 border-amber-500/60 text-amber-100' : 'bg-black/40 border-gray-800/80 text-gray-400 hover:text-gray-200'}`}
                                >
                                    <div className="text-[11px] font-bold flex justify-between items-center">
                                        <span>{preset.label}</span>
                                        {active && <span className="text-[9px] font-mono text-amber-400">ACTIVE</span>}
                                    </div>
                                    <div className="text-[9px] opacity-70 mt-0.5">{preset.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

window.CORAL.SandboxWorkspace = SandboxWorkspace;
})();
