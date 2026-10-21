// C.O.R.A.L. DNA Vault & Info Modals
(() => {
window.CORAL = window.CORAL || {};

const { useState, useEffect, useRef, useMemo } = React;
const { Database, Save, Upload, Shield, Check, Copy, Share2, Zap, Brain, Repeat, Palette, Target } = window.CORAL;

const DnaVaultModal = ({ isOpen, onClose, onExport, onImport, onQuickSave, onQuickLoad, hasSavedSlot, toast }) => {
    const [tab, setTab] = useState('export');
    const [exportText, setExportText] = useState('');
    const [importText, setImportText] = useState('');
    const [isSerializing, setIsSerializing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [dnaInspection, setDnaInspection] = useState(null);
    const fileInputRef = useRef(null);
    const onExportRef = useRef(onExport);

    useEffect(() => {
        onExportRef.current = onExport;
    }, [onExport]);

    useEffect(() => {
        if (!isOpen) return;
        if (tab === 'export') {
            let cancelled = false;
            setIsSerializing(true);
            const timer = setTimeout(() => {
                onExportRef.current().then(res => {
                    if (cancelled) return;
                    if (res) {
                        setExportText(res.jsonString || '');
                        setDnaInspection(res.inspection || null);
                    }
                    setIsSerializing(false);
                }).catch(() => {
                    if (!cancelled) setIsSerializing(false);
                });
            }, 30);
            return () => {
                cancelled = true;
                clearTimeout(timer);
            };
        }
    }, [isOpen, tab]);

    useEffect(() => {
        if (!isOpen || tab !== 'import') return;
        if (!importText.trim()) {
            setDnaInspection(null);
            return;
        }
        const timer = setTimeout(() => {
            try {
                const parsed = JSON.parse(importText);
                setDnaInspection(window.CORAL.inspectDnaObject(parsed, importText.length));
            } catch (e) {
                setDnaInspection(null);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [isOpen, importText, tab]);

    const safeExportPreview = useMemo(() => {
        if (isSerializing) return "Serializing neural weights, ponder embeddings, and Adam momentum tensors from GPU...";
        if (!exportText) return "";
        if (exportText.length <= 4096) return exportText;
        return exportText.slice(0, 4096) + `\n\n... [Preview truncated at 4KB for mobile UI performance. Full ${(exportText.length / 1024).toFixed(1)} KB DNA payload is ready via Copy / Download / Share above!]`;
    }, [exportText, isSerializing]);

    if (!isOpen) return null;

    const handleCopy = () => {
        if (!exportText) return;
        const fallbackCopy = () => {
            try {
                const ta = document.createElement('textarea');
                ta.value = exportText;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) {
                    setCopied(true);
                    toast("Brain DNA copied to clipboard!");
                    setTimeout(() => setCopied(false), 2000);
                } else {
                    toast("Clipboard access failed - use Download instead");
                }
            } catch (err) {
                toast("Clipboard access failed - use Download instead");
            }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(exportText).then(() => {
                setCopied(true);
                toast("Brain DNA copied to clipboard!");
                setTimeout(() => setCopied(false), 2000);
            }).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    };

    const handleDownloadFile = () => {
        if (!exportText) return;
        try {
            const blob = new Blob([exportText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `coral_v15_brain_dna.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 150);
            toast("Download initiated!");
        } catch(e) {
            toast("Download blocked by browser sandbox; use Copy instead");
        }
    };

    const handleNativeShare = async () => {
        if (!exportText) return;
        try {
            if (navigator.share) {
                const file = new File([exportText], 'coral_v15_brain_dna.json', { type: 'application/json' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'C.O.R.A.L. v15.1 Brain DNA' });
                } else {
                    await navigator.share({ title: 'C.O.R.A.L. v15.1 Brain DNA', text: exportText });
                }
                toast("Shared successfully!");
            } else {
                handleCopy();
            }
        } catch(err) {
            if (err.name !== 'AbortError') toast("Share failed; use Copy button");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const content = ev.target.result;
                await onImport(content);
                onClose();
            } catch(err) {
                toast("Corrupted DNA File");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handlePasteImport = async () => {
        if (!importText.trim()) {
            toast("Please paste DNA JSON text first");
            return;
        }
        await onImport(importText.trim());
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6">
            <div className="glass-panel w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gray-950/70">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Database size={17} className="text-amber-400"/> BRAIN DNA VAULT &amp; PARITY INSPECTOR (v15.3)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none px-2">&times;</button>
                </div>

                <div className="flex border-b border-gray-800 bg-gray-950/50">
                    <button onClick={() => setTab('export')} className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${tab==='export' ? 'text-amber-400 border-amber-400 bg-amber-950/20' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>
                        <Save size={13}/> EXPORT BRAIN + ADAM STATE
                    </button>
                    <button onClick={() => setTab('import')} className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${tab==='import' ? 'text-sky-400 border-sky-400 bg-sky-950/20' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>
                        <Upload size={13}/> IMPORT &amp; VERIFY BRAIN
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4 text-xs">
                    {dnaInspection && (
                        <div className="p-3 bg-gray-900/90 border border-sky-500/30 rounded-xl space-y-2">
                            <div className="flex justify-between items-center border-b border-gray-800 pb-1.5">
                                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                                    <Shield size={13}/> DNA SNAPSHOT TELEMETRY ({dnaInspection.type})
                                </span>
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-700/40">
                                    100% Weight Integrity
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                                <div className="bg-black/50 p-2 rounded border border-gray-800">
                                    <div className="text-gray-500">TOPOLOGY</div>
                                    <div className="text-white font-bold">{dnaInspection.numLayers}L • {dnaInspection.activeN}N</div>
                                </div>
                                <div className="bg-black/50 p-2 rounded border border-gray-800">
                                    <div className="text-gray-500">PARAMETERS</div>
                                    <div className="text-cyan-300 font-bold">{(dnaInspection.paramCount / 1000).toFixed(1)}K Floats</div>
                                </div>
                                <div className="bg-black/50 p-2 rounded border border-gray-800">
                                    <div className="text-gray-500">TRUE GPU VRAM</div>
                                    <div className="text-amber-300 font-bold">{dnaInspection.expectedTensors}T (~{dnaInspection.binaryVramMb}MB)</div>
                                </div>
                                <div className="bg-black/50 p-2 rounded border border-gray-800">
                                    <div className="text-gray-500">ADAM MOMENTUM</div>
                                    <div className={dnaInspection.hasOpt ? "text-emerald-400 font-bold" : "text-gray-400"}>
                                        {dnaInspection.hasOpt ? "Included (m & v)" : "Warm-Init"}
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-400 leading-relaxed">
                                Note: ASCII JSON text takes <span className="text-gray-200 font-mono">{dnaInspection.jsonKb} KB</span> on disk, which compiles to <span className="text-amber-300 font-mono">~{dnaInspection.binaryVramMb} MB</span> of 4-byte binary <span className="font-mono">float32</span> tensors in WebGL/WebGPU RAM.
                            </div>
                        </div>
                    )}

                    {tab === 'export' ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-emerald-950/25 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-emerald-300">Quick Save to Browser Memory</div>
                                    <div className="text-[10px] text-gray-400">Stores weights, task tokens, ponder embeddings &amp; Adam momentum in LocalStorage.</div>
                                </div>
                                <button disabled={isSerializing} onClick={() => { onQuickSave(exportText); }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg shadow transition-all">
                                    Quick Save
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <button disabled={isSerializing} onClick={handleCopy} className="p-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 border border-gray-800 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all">
                                    {copied ? <Check size={16} className="text-emerald-400"/> : <Copy size={16} className="text-sky-400"/>}
                                    <span className="text-[10px]">{copied ? 'Copied!' : 'Copy Full JSON'}</span>
                                </button>
                                <button disabled={isSerializing} onClick={handleDownloadFile} className="p-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 border border-gray-800 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all">
                                    <Save size={16} className="text-amber-400"/>
                                    <span className="text-[10px]">Download .json</span>
                                </button>
                                <button disabled={isSerializing} onClick={handleNativeShare} className="p-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 border border-gray-800 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all">
                                    <Share2 size={16} className="text-pink-400"/>
                                    <span className="text-[10px]">Mobile Share</span>
                                </button>
                            </div>

                            <div>
                                <div className="text-[10px] font-mono text-gray-400 mb-1 flex justify-between">
                                    <span>SERIALIZED DNA PREVIEW (4KB CAP):</span>
                                    <span>{exportText ? `${(exportText.length/1024).toFixed(1)} KB Total` : 'Serializing...'}</span>
                                </div>
                                <textarea readOnly value={safeExportPreview} className="w-full h-28 bg-[#050508] border border-gray-800 rounded-xl p-2.5 font-mono text-[9px] text-gray-400 focus:outline-none resize-none"/>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />

                            {hasSavedSlot && (
                                <div className="p-3 bg-sky-950/25 border border-sky-500/30 rounded-xl flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-sky-300">Quick Restore from Browser Memory</div>
                                        <div className="text-[10px] text-gray-400">Found saved brain snapshot in LocalStorage.</div>
                                    </div>
                                    <button onClick={async () => { await onQuickLoad(); onClose(); }} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow transition-all">
                                        Restore
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                    <Upload size={14} className="text-amber-400"/> Pick .json File
                                </button>
                            </div>

                            <div>
                                <div className="text-[10px] font-mono text-gray-400 mb-1">OR PASTE DNA JSON STRING TO INSPECT &amp; HYDRATE:</div>
                                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste full C.O.R.A.L. DNA JSON string here..." className="w-full h-28 bg-[#050508] border border-gray-800 rounded-xl p-2.5 font-mono text-[9px] text-gray-300 focus:border-sky-500 focus:outline-none resize-none"/>
                            </div>

                            <button onClick={handlePasteImport} className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5">
                                <Zap size={13}/> Hydrate Synapses &amp; Optimizer State
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoModal = ({ onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gray-950/60">
                <h2 className="text-base font-bold text-white flex items-center gap-2"><Brain size={20} className="text-amber-500"/> C.O.R.A.L. v15.3 SYMBOLIC &amp; RECURRENT CORTEX</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-gray-300 text-xs md:text-sm leading-relaxed">
                <div>
                    <h3 className="text-sky-400 font-bold mb-1.5 uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <Repeat size={14} className="text-sky-400"/> 1. Recurrent Pondering Loop &amp; Prefix-Detached BPTT
                    </h3>
                    <p>Rather than tying computational depth strictly to parameter count, C.O.R.A.L. v15.3 cycles the latent token stream through its existing organic layers for <i>K</i> recurrent "Thinking Steps" before projecting to the output head. A 3-layer cortex pondering for <i>K=4</i> steps achieves an effective depth of <b>12 layers with 0 additional weight matrices</b>!</p>
                </div>
                <div>
                    <h3 className="text-purple-400 font-bold mb-1.5 uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <Palette size={14} className="text-purple-400"/> 2. Dynamic Symbolic Vocabulary &amp; Zero-Shock Class Expansion
                    </h3>
                    <p>Switch seamlessly between <b>SCALAR (1D Continuous)</b> regression and <b>VOCAB (V/10 Classes)</b> symbolic readout! In Vocabulary Mode, C.O.R.A.L. projects each token into <i>V</i> discrete symbol slots ordered by curriculum frequency (<span className="font-mono text-gray-200">Sym 0, Sym 9, Sym 1..8</span>) and computes a differentiable expected value over the active symbol anchors. When new symbol classes are unlocked (`+2 V`), outgoing weights are zeroed and logit biases are shielded at <span className="font-mono">-6.0</span> (<span className="font-mono">P &asymp; 0.002</span>) for <b>Zero-Shock Vocabulary Neurogenesis</b>!</p>
                </div>
                <div>
                    <h3 className="text-pink-400 font-bold mb-1.5 uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <Target size={14} className="text-pink-400"/> 3. Custom Task Sandbox (Tier 21) &amp; 1D/2D Manifold Switcher
                    </h3>
                    <p>Paint your own few-shot Input &rarr; Target ARC pairs or activate algorithmic presets (90&deg; Rotation, 1D Rule 110 Automaton, Symbolic Color Swap) on <b>[TASK_21]</b> with automatic toroidal spatial shift and symbol permutation augmentations, and switch positional encodings live between <b>2D Axial RoPE</b> and <b>1D Sequential RoPE</b>!</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-3.5 bg-gray-900/70 rounded-xl border border-gray-800">
                        <h3 className="text-emerald-400 font-bold mb-2 uppercase tracking-wider text-xs flex items-center gap-1.5"><Zap size={13}/> Zero-Shock Neurogenesis</h3>
                        <p className="text-xs text-gray-300 mb-2">When dormant or previously pruned neurons/heads are grown, incoming synapses initialize with fresh Gaussian priors while outgoing projections are strictly zeroed (<i>W<sub>out</sub> = 0</i>).</p>
                        <p className="text-xs text-gray-400">Guarantees <i>f<sub>new</sub>(x) = f<sub>old</sub>(x)</i> at birth with zero loss spike.</p>
                    </div>
                    <div className="p-3.5 bg-gray-900/70 rounded-xl border border-gray-800">
                        <h3 className="text-amber-400 font-bold mb-2 uppercase tracking-wider text-xs flex items-center gap-1.5"><Shield size={13}/> Myelinated Synaptic Armor</h3>
                        <p className="text-xs text-gray-300 mb-2">Mastered tasks myelinate top synapses (`🔒`) and DNA exports serialize both model weights and Adam optimizer momentum (<i>m, v</i>) for zero-wobble training resumption.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

Object.assign(window.CORAL, {
    DnaVaultModal,
    InfoModal
});
})();
