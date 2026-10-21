// C.O.R.A.L. Real-Time Telemetry & Evolution SVG Charts
window.CORAL = window.CORAL || {};

const { useMemo } = React;
const { Eye, Trash, Zap } = window.CORAL;

const getRobustMax = (data) => {
    if (data.length === 0) return 1;
    const sorted = [...data].filter(v => isFinite(v)).sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.97);
    return Math.max(0.0001, sorted[index]);
};

const GeneralizationChart = ({ trainData, valData, threshold, step, onReset }) => {
    const sampledData = useMemo(() => {
        const len = trainData.length;
        if (len < 300) return { t: trainData, v: valData };
        const t = [], v = [];
        const stride = Math.ceil(len / 300);
        for(let i=0; i<len; i+=stride) { t.push(trainData[i]); v.push(valData[i]); }
        t.push(trainData[len-1]); v.push(valData[len-1]);
        return { t, v };
    }, [trainData, valData, step]); 
    
    if (!trainData.length) return <div className="h-44 flex items-center justify-center text-gray-600 text-xs bg-gray-900/50 rounded-2xl border border-gray-800">Waiting for training telemetry...</div>;
    
    const { t, v } = sampledData;
    const robustMax = Math.max(getRobustMax(t), getRobustMax(v));
    const totalPoints = t.length;
    const getY = (d) => { if (!isFinite(d)) return 100; const val = Math.min(d, robustMax); return 100 - (val / robustMax) * 100; };
    const pointsTrain = t.map((d, i) => `${(i / (totalPoints - 1 || 1)) * 100},${getY(d)}`).join(' ');
    const pointsVal = v.map((d, i) => `${(i / (totalPoints - 1 || 1)) * 100},${getY(d)}`).join(' ');
    
    return (
        <div className="relative h-44 w-full bg-[#08080c] rounded-2xl border border-gray-800/80 overflow-hidden chart-grid shadow-inner select-none group">
            <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2"><h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5"><Eye size={13} className="text-emerald-400"/> GENERALIZATION GAP (MSE LOSS)</h3></div>
                    <div className="flex gap-4 mt-1"><span className="text-[10px] font-mono text-emerald-400">TRAIN: {Number(trainData[trainData.length-1]||0).toFixed(4)}</span><span className="text-[10px] font-mono text-amber-400">VAL: {Number(valData[valData.length-1]||0).toFixed(4)}</span></div>
                </div>
                <div className="pointer-events-auto flex items-center gap-2">
                     <span className="text-[10px] font-mono text-gray-400 bg-black/70 px-2 py-0.5 rounded border border-gray-800">STEP: {step}</span>
                     <button onClick={onReset} className="p-1.5 bg-black/70 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded border border-gray-800 hover:border-red-900 transition-all" title="Reset Graph Scale"><Trash size={12} /></button>
                </div>
            </div>
            <div className="absolute w-full border-t border-dashed border-emerald-500/30" style={{ bottom: `${Math.min(100, (threshold/robustMax)*100)}%` }}></div>
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline points={pointsTrain} fill="none" stroke="#10b981" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeOpacity="0.85" />
                <polyline points={pointsVal} fill="none" stroke="#f59e0b" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeOpacity="0.85" />
            </svg>
        </div>
    );
};

const CapacityEvolutionChart = ({ neuronData, consolidatedData, maxCapacity, step }) => {
    const sampledData = useMemo(() => {
        const len = neuronData.length;
        if (len < 300) return { n: neuronData, c: consolidatedData };
        const n = [], c = [];
        const stride = Math.ceil(len / 300);
        for (let i = 0; i < len; i += stride) {
            n.push(neuronData[i]);
            c.push(consolidatedData[i] || 0);
        }
        n.push(neuronData[len - 1]);
        c.push(consolidatedData[len - 1] || 0);
        return { n, c };
    }, [neuronData, consolidatedData, step]);

    if (!neuronData.length) {
        return (
            <div className="h-44 flex items-center justify-center text-gray-600 text-xs bg-gray-900/50 rounded-2xl border border-gray-800">
                Waiting for neurogenesis &amp; myelination telemetry...
            </div>
        );
    }

    const { n, c } = sampledData;
    const peakN = Math.max(maxCapacity || 256, ...n, 16);
    const totalPoints = n.length;
    const getY = (val) => 100 - Math.min(96, Math.max(2, (val / peakN) * 92));
    const pointsActive = n.map((d, i) => `${(i / (totalPoints - 1 || 1)) * 100},${getY(d)}`).join(' ');
    const pointsLocked = c.map((d, i) => `${(i / (totalPoints - 1 || 1)) * 100},${getY(d)}`).join(' ');

    return (
        <div className="relative h-44 w-full bg-[#08080c] rounded-2xl border border-gray-800/80 overflow-hidden chart-grid shadow-inner select-none">
            <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                            <Zap size={13} className="text-amber-400"/> TOPOLOGY &amp; MYELINATION EVOLUTION
                        </h3>
                    </div>
                    <div className="flex gap-4 mt-1">
                        <span className="text-[10px] font-mono text-amber-400">ACTIVE: {n[n.length - 1] || 0}N</span>
                        <span className="text-[10px] font-mono text-sky-400">MYELINATED: {c[c.length - 1] || 0}🔒</span>
                    </div>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-black/70 px-2 py-0.5 rounded border border-gray-800">
                    MAX: {maxCapacity}N
                </span>
            </div>
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline points={pointsActive} fill="none" stroke="#f59e0b" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeOpacity="0.9" />
                <polyline points={pointsLocked} fill="none" stroke="#38bdf8" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeOpacity="0.85" />
            </svg>
        </div>
    );
};

Object.assign(window.CORAL, {
    getRobustMax,
    GeneralizationChart,
    CapacityEvolutionChart
});
