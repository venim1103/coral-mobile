// C.O.R.A.L. Master React Application Orchestrator
(() => {
window.CORAL = window.CORAL || {};

const { useState, useEffect, useRef, useCallback, useMemo } = React;
const {
    VAL_SET_SIZE, NUM_TASKS, MAX_PONDER_STEPS, MAX_VOCAB,
    VOCAB_ANCHOR_VALUES, VOCAB_SLOT_LABELS, VOCAB_SLOT_DIGITS,
    ARC_PALETTE, getPixelColor, TIERS,
    createDefaultSandboxPairs, fitGridToSize, evalCustomTarget, createDataset,
    get2DAxialRoPE, applyRoPE,
    OrganicBlock, CoralModel,
    serializeOptimizerState, restoreOptimizerState, inspectDnaObject,
    Icons,
    GeneralizationChart, CapacityEvolutionChart,
    SignalFlowViz, MultiBlockViz, AttentionViz,
    DnaVaultModal, InfoModal,
    StudioWorkspace, TelemetryWorkspace, SandboxWorkspace
} = window.CORAL;

const {
    Play, Pause, Zap, Brain, Eye, Lock, Unlock, Save, Upload,
    RotateCcw, Scissors, Target, Settings, Layers, Activity, Trash,
    BookOpen, Waves, Info, Shuffle, Crosshair, Copy, Check, Share2,
    Database, GitMerge, Shield, Repeat, Palette
} = Icons;

const App = () => {
    const gameState = useRef({ 
        mainTab: 'studio',
        tier: 1, 
        trainSet: null, 
        valSet: null, 
        isPlaying: false, 
        autoEvolve: true, 
        activeNeurons: 8, 
        consolidatedNeurons: 0,
        maxPossibleNeurons: 256, 
        trainHistory: [], 
        valHistory: [], 
        neuronHistory: [],
        consolidatedHistory: [],
        status: "IDLE",
        learningRate: 0.003,
        batchSize: 64,
        chunkSize: 8,
        simSpeed: 3,
        evoThreshold: 0.005,
        regStrength: 0.00001,
        headRatio: 24,
        pruneRate: 0.15,
        replayRate: 0.12,
        memoryReplay: true,
        highPerf: false,
        vizBlockIndex: 0,
        ponderSteps: 1,
        readoutMode: 'scalar',
        activeVocab: 4,
        manifoldMode: '2d'
    });

    const [uiState, setUiState] = useState({ 
        mainTab: 'studio', // 'studio' | 'telemetry' | 'sandbox'
        tier: 1, 
        step: 0, 
        isPlaying: false, 
        autoEvolve: true, 
        activeNeurons: 8, 
        consolidatedNeurons: 0,
        maxPossibleNeurons: 256, 
        status: "IDLE", 
        backend: "Initializing...", 
        learningRate: 0.003, 
        batchSize: 64, 
        configSize: 256, 
        chunkSize: 8, 
        simSpeed: 3, 
        maxBlocks: 3, 
        ponderSteps: 1, 
        readoutMode: 'scalar',
        activeVocab: 4,
        manifoldMode: '2d',
        colorMode: 'arc',
        vizMode: 'flow', 
        vizBlockIndex: 0, 
        memoryReplay: true, 
        highPerf: false, 
        evoThreshold: 0.005, 
        regStrength: 0.00001, 
        headRatio: 24, 
        pruneRate: 0.15, 
        replayRate: 0.12, 
        maxHeads: 4, 
        dModel: 64, 
        gridSize: 4 
    });

    const [customSandbox, setCustomSandbox] = useState(() => ({
        mode: 'pairs',
        activePairIdx: 0,
        brushSymbol: 9,
        augColorPermute: true,
        augSpatialShift: true,
        pairs: createDefaultSandboxPairs(4)
    }));
    const customSandboxRef = useRef(customSandbox);
    const isPaintingRef = useRef(false);

    const updateCustomSandbox = useCallback((updater) => {
        setCustomSandbox(prev => {
            const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
            customSandboxRef.current = next;
            return next;
        });
    }, []);

    useEffect(() => {
        const handleMouseUp = () => { isPaintingRef.current = false; };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const [blendConfig, setBlendConfig] = useState({
        enabled: false,
        secondaryTier: 2,
        alpha: 0.5
    });

    const [showSettings, setShowSettings] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showDnaModal, setShowDnaModal] = useState(false);
    const [snapshots, setSnapshots] = useState(null);
    const [msg, setMsg] = useState(null);
    const [isReplaying, setIsReplaying] = useState(false);
    const [selectedToken, setSelectedToken] = useState(0); 
    const [retentionMap, setRetentionMap] = useState({}); 
    const [telemetry, setTelemetry] = useState({ sps: 0, tensors: 0, memoryMb: "0", paramsK: "51.1", layers: 1, effectiveLayers: 1 });
    const [hasSavedSlot, setHasSavedSlot] = useState(() => !!localStorage.getItem('coral_brain_dna_slot'));

    const [probeInput, setProbeInput] = useState(() => {
        const arr = new Array(16).fill(0);
        arr[0] = 9; arr[5] = 6; arr[10] = 9; arr[15] = 9;
        return arr;
    });
    const [isTfReady, setIsTfReady] = useState(false);
    
    const modelRef = useRef(null); 
    const optimizerRef = useRef(null); 
    const animFrameRef = useRef(null); 
    const replayBatchRef = useRef(null);
    const stepRef = useRef(0); 
    const lastDrawTime = useRef(0); 
    const lastTelemetryTime = useRef(performance.now());
    const lastStepCount = useRef(0);
    const isHydratingRef = useRef(false);
    const isGrowingRef = useRef(false);
    const isSyncingUIRef = useRef(false);
    const isTrainingStepRef = useRef(false);
    const isReplayingRef = useRef(false);
    const pendingVizSyncRef = useRef(false);
    const loopIdRef = useRef(0);
    const setupTimeoutRef = useRef(null);
    const retentionTargetTierRef = useRef(1);
    const isEvaluatingRetentionRef = useRef(false);
    const frameCountRef = useRef(0);
    const lastValLossRef = useRef(0.25);
    const FPS_LIMIT = 15; 

    const showToast = (text) => {
        setMsg(text);
        setTimeout(() => setMsg(null), 2600);
    };

    const refreshMemoryTelemetry = useCallback((spsOverride = null) => {
        if (!tf.getBackend()) return;
        const mem = tf.memory();
        const activeModel = modelRef.current;
        const paramsK = activeModel && !activeModel.isDisposed ? (activeModel.getTotalParameters() / 1000).toFixed(1) : "0.0";
        const layers = activeModel && !activeModel.isDisposed ? activeModel.layers.length : 1;
        const pSteps = activeModel && !activeModel.isDisposed ? (activeModel.config.ponderSteps || 1) : 1;
        setTelemetry(prev => ({
            sps: spsOverride !== null ? spsOverride : prev.sps,
            tensors: mem.numTensors,
            memoryMb: (mem.numBytes / (1024 * 1024)).toFixed(2),
            paramsK,
            layers,
            effectiveLayers: layers * pSteps
        }));
    }, []);

    const updateState = (updates) => { 
        Object.assign(gameState.current, updates); 
        setUiState(prev => ({ ...prev, ...updates })); 
    };

    const handleResetGraph = () => {
        gameState.current.trainHistory = [];
        gameState.current.valHistory = [];
        gameState.current.neuronHistory = [];
        gameState.current.consolidatedHistory = [];
        setUiState(prev => ({ ...prev }));
    };

    const warmupOptimizer = useCallback((model, opt, tierId, regStrength) => {
        if (!model || model.isDisposed || !opt) return;
        tf.tidy(() => {
            const savedLR = opt.learningRate;
            opt.learningRate = 0;
            const dummyX = tf.zeros([1, model.seqLen]);
            const dummyY = tf.zeros([1, model.seqLen]);
            const cost = opt.minimize(() => {
                return model.computeTrainLoss(dummyX, dummyY, null, null, tierId, null, 2, regStrength);
            }, true, model.getOrderedVariables());
            if (cost) cost.dispose();
            opt.learningRate = savedLR;
        });
    }, []);

    const syncUI = useCallback(async (forceInput = null, forceVizIdx = null) => {
        if (isSyncingUIRef.current) return;
        const activeModel = modelRef.current;
        if (activeModel && !activeModel.isDisposed && isTfReady) {
            isSyncingUIRef.current = true;
            let probe = null;
            try {
                const inputToUse = forceInput || probeInput; 
                const expectedLen = activeModel.seqLen;
                const safeInput = inputToUse.length === expectedLen ? inputToUse : new Array(expectedLen).fill(0);
                const normalizedInput = safeInput.map(v => v/10);
                probe = tf.tidy(() => tf.tensor2d([normalizedInput], [1, expectedLen]));
                const activeVizIdx = forceVizIdx !== null ? forceVizIdx : (gameState.current.vizBlockIndex || 0);
                const data = await activeModel.getVizData(probe, gameState.current.tier, blendConfig, activeVizIdx); 

                if (data && modelRef.current === activeModel && !activeModel.isDisposed) { 
                    const neuronCount = activeModel.getTotalActiveNeurons();
                    const consolidatedCount = activeModel.getTotalConsolidatedNeurons();
                    const maxPossible = activeModel.getMaxPossibleNeurons();
                    setSnapshots(data); 
                    gameState.current.activeNeurons = neuronCount;
                    gameState.current.consolidatedNeurons = consolidatedCount;
                    gameState.current.maxPossibleNeurons = maxPossible;
                    setUiState(prev => ({ 
                        ...prev, 
                        activeNeurons: neuronCount, 
                        consolidatedNeurons: consolidatedCount,
                        maxPossibleNeurons: maxPossible,
                        ponderSteps: activeModel.config.ponderSteps || 1,
                        readoutMode: activeModel.config.readoutMode || 'scalar',
                        activeVocab: activeModel.config.activeVocab || 4,
                        manifoldMode: activeModel.config.manifoldMode || '2d'
                    }));
                }
                refreshMemoryTelemetry();
            } finally {
                if (probe && !probe.isDisposed) probe.dispose();
                isSyncingUIRef.current = false;
            }
        }
    }, [probeInput, isTfReady, blendConfig, refreshMemoryTelemetry]);

    const setupTier = useCallback((tierId, keepWeights = true, customConfig = null, customProbe = null) => {
        if (!isTfReady) return;
        if (setupTimeoutRef.current) {
            clearTimeout(setupTimeoutRef.current);
            setupTimeoutRef.current = null;
        }
        gameState.current.isTransitioning = true;
        const gs = gameState.current;
        
        const baseCfg = customConfig || (keepWeights && modelRef.current ? {
            batchSize: gs.batchSize,
            learningRate: gs.learningRate,
            gridSize: modelRef.current.config.gridSize,
            configSize: modelRef.current.config.size,
            maxBlocks: modelRef.current.config.maxBlocks,
            maxHeads: modelRef.current.config.maxHeads,
            dModel: modelRef.current.config.dModel,
            ponderSteps: modelRef.current.config.ponderSteps || uiState.ponderSteps || 1,
            readoutMode: modelRef.current.config.readoutMode || uiState.readoutMode || 'scalar',
            activeVocab: modelRef.current.config.activeVocab || uiState.activeVocab || 4,
            manifoldMode: modelRef.current.config.manifoldMode || uiState.manifoldMode || '2d'
        } : uiState);

        const gSize = baseCfg.gridSize || 4;
        const bSize = baseCfg.batchSize || gs.batchSize || 64;
        const lr = baseCfg.learningRate || gs.learningRate || 0.003;
        const pSteps = baseCfg.ponderSteps || uiState.ponderSteps || 1;
        const rMode = baseCfg.readoutMode || uiState.readoutMode || 'scalar';
        const aVocab = baseCfg.activeVocab || uiState.activeVocab || 4;
        const mMode = baseCfg.manifoldMode || uiState.manifoldMode || '2d';

        if (gs.trainSet) { if(gs.trainSet.xs && !gs.trainSet.xs.isDisposed) gs.trainSet.xs.dispose(); if(gs.trainSet.ys && !gs.trainSet.ys.isDisposed) gs.trainSet.ys.dispose(); }
        if (gs.valSet) { if(gs.valSet.xs && !gs.valSet.xs.isDisposed) gs.valSet.xs.dispose(); if(gs.valSet.ys && !gs.valSet.ys.isDisposed) gs.valSet.ys.dispose(); }
        if (replayBatchRef.current) {
            if (replayBatchRef.current.xs && !replayBatchRef.current.xs.isDisposed) replayBatchRef.current.xs.dispose();
            if (replayBatchRef.current.ys && !replayBatchRef.current.ys.isDisposed) replayBatchRef.current.ys.dispose();
            replayBatchRef.current = null;
        }
        
        const trainSet = createDataset(bSize, tierId, gSize, customSandboxRef.current);
        const valSet = createDataset(VAL_SET_SIZE, tierId, gSize, customSandboxRef.current);
        const inputLen = gSize * gSize; 
        const config = { 
            inputDim: inputLen, 
            outputDim: inputLen, 
            size: baseCfg.configSize || baseCfg.size || 256, 
            maxBlocks: baseCfg.maxBlocks || 3, 
            maxHeads: baseCfg.maxHeads || 4, 
            dModel: baseCfg.dModel || 64, 
            gridSize: gSize,
            ponderSteps: pSteps,
            readoutMode: rMode,
            activeVocab: aVocab,
            manifoldMode: mMode
        };
        
        if (!modelRef.current || !keepWeights) {
            if(modelRef.current) modelRef.current.dispose();
            if(optimizerRef.current) optimizerRef.current.dispose();
            modelRef.current = new CoralModel(config); 
            optimizerRef.current = tf.train.adam(lr);
            warmupOptimizer(modelRef.current, optimizerRef.current, tierId, gs.regStrength);
            stepRef.current = 0;
            lastStepCount.current = 0;
            const activeN = modelRef.current.getTotalActiveNeurons();
            const consN = modelRef.current.getTotalConsolidatedNeurons();
            const maxN = modelRef.current.getMaxPossibleNeurons();
            updateState({ tier: tierId, trainSet, valSet, activeNeurons: activeN, consolidatedNeurons: consN, maxPossibleNeurons: maxN, trainHistory: [], valHistory: [], neuronHistory: [], consolidatedHistory: [], status: "READY", vizBlockIndex: 0, readoutMode: rMode, activeVocab: aVocab, manifoldMode: mMode });
            setUiState(prev => ({ ...prev, step: 0, vizBlockIndex: 0, ponderSteps: pSteps, readoutMode: rMode, activeVocab: aVocab, manifoldMode: mMode }));
        } else {
            modelRef.current.config.maxBlocks = config.maxBlocks; 
            modelRef.current.config.ponderSteps = pSteps;
            modelRef.current.config.readoutMode = rMode;
            modelRef.current.config.activeVocab = aVocab;
            if (modelRef.current.config.manifoldMode !== mMode) {
                modelRef.current.setManifoldMode(mMode);
            }
            if (!optimizerRef.current) {
                optimizerRef.current = tf.train.adam(lr); 
                warmupOptimizer(modelRef.current, optimizerRef.current, tierId, gs.regStrength);
            } else {
                optimizerRef.current.learningRate = lr;
            }
            const activeN = modelRef.current.getTotalActiveNeurons();
            const consN = modelRef.current.getTotalConsolidatedNeurons();
            const maxN = modelRef.current.getMaxPossibleNeurons();
            updateState({ tier: tierId, trainSet, valSet, activeNeurons: activeN, consolidatedNeurons: consN, maxPossibleNeurons: maxN, status: gs.isPlaying ? "TRAINING" : "READY", readoutMode: rMode, activeVocab: aVocab, manifoldMode: mMode });
        }
        setupTimeoutRef.current = setTimeout(() => { 
            gameState.current.isTransitioning = false; 
            syncUI(customProbe);
            refreshMemoryTelemetry(0);
        }, 40);
    }, [isTfReady, uiState, syncUI, refreshMemoryTelemetry, warmupOptimizer]);

    const handleReset = useCallback((customCfg = null) => { 
        updateState({ isPlaying: false }); 
        setRetentionMap({});
        setupTier(1, false, customCfg); 
        showToast("Brain Architecture Seed Rebuilt"); 
    }, [setupTier]);

    useEffect(() => { 
        const init = async () => { 
            try {
                await tf.setBackend('cpu');
                await tf.ready();
                setUiState(p => ({ ...p, backend: 'cpu' })); 
                setIsTfReady(true);
            } catch (err) {
                console.error("TF init error:", err);
                setIsTfReady(true);
            }
        }; 
        init(); 
    }, []);

    const handleCycleBackend = async () => {
        const current = tf.getBackend();
        const next = current === 'cpu' ? 'webgpu' : 'cpu';
        
        if (next === 'webgpu' && !navigator.gpu) {
            showToast("WebGPU is not supported on this browser/device");
            return;
        }

        try {
            await tf.setBackend(next);
            await tf.ready();
            tf.tidy(() => { const t = tf.tensor1d([1]); t.square(); });
            setUiState(p => ({ ...p, backend: next }));
            refreshMemoryTelemetry();
            showToast(`Active Backend: ${next.toUpperCase()}`);
        } catch(e) {
            await tf.setBackend('cpu');
            setUiState(p => ({ ...p, backend: 'cpu' }));
            showToast(`Switch to ${next.toUpperCase()} failed (reverted to CPU)`);
        }
    };

    useEffect(() => { 
        if (!isTfReady) return;
        if (isHydratingRef.current) return;
        
        if (modelRef.current &&
            modelRef.current.config.gridSize === uiState.gridSize &&
            modelRef.current.config.dModel === uiState.dModel &&
            modelRef.current.config.maxHeads === uiState.maxHeads &&
            modelRef.current.config.size === uiState.configSize) {
            return;
        }

        const len = uiState.gridSize * uiState.gridSize; 
        updateCustomSandbox(prev => ({
            ...prev,
            pairs: (prev.pairs || []).map(p => ({
                ...p,
                input: fitGridToSize(p.input, len),
                target: fitGridToSize(p.target, len)
            }))
        }));
        const defaultProbe = new Array(len).fill(0);
        defaultProbe[0] = 9; 
        if (len > 5) defaultProbe[5] = 6;
        if (len > 10) defaultProbe[10] = 9;
        setProbeInput(defaultProbe); 
        updateState({ isPlaying: false });
        setupTier(gameState.current.tier, false, uiState, defaultProbe);
    }, [uiState.gridSize, uiState.dModel, uiState.maxHeads, uiState.configSize, isTfReady]);

    useEffect(() => {
        if (!isTfReady || !modelRef.current || isHydratingRef.current) return;
        const gs = gameState.current;
        if (gs.trainSet && gs.trainSet.xs && !gs.trainSet.xs.isDisposed && gs.trainSet.xs.shape[0] === gs.batchSize) {
            return;
        }
        if (gs.trainSet) { if(gs.trainSet.xs && !gs.trainSet.xs.isDisposed) gs.trainSet.xs.dispose(); if(gs.trainSet.ys && !gs.trainSet.ys.isDisposed) gs.trainSet.ys.dispose(); }
        gs.trainSet = createDataset(gs.batchSize, gs.tier, modelRef.current.config.gridSize, customSandboxRef.current);
    }, [uiState.batchSize, isTfReady]);

    useEffect(() => { 
        if (isTfReady && !isHydratingRef.current && !gameState.current.isTransitioning) syncUI(probeInput); 
    }, [probeInput, blendConfig, isTfReady]);

    const evaluateRetentionRoundRobin = useCallback(async () => {
        const activeModel = modelRef.current;
        if (!activeModel || activeModel.isDisposed || gameState.current.tier <= 1 || isEvaluatingRetentionRef.current) return;
        const currentTier = gameState.current.tier;
        const gSize = activeModel.config.gridSize;

        let targetTier = retentionTargetTierRef.current;
        if (targetTier >= currentTier) {
            targetTier = 1;
        }
        retentionTargetTierRef.current = targetTier + 1;

        isEvaluatingRetentionRef.current = true;
        try {
            const testBatch = createDataset(16, targetTier, gSize, customSandboxRef.current);
            if (testBatch.xs && !testBatch.xs.isDisposed && modelRef.current === activeModel && !activeModel.isDisposed) {
                const lossTensor = tf.tidy(() => {
                    const pred = activeModel.predictInference(testBatch.xs, targetTier);
                    return tf.losses.meanSquaredError(testBatch.ys, pred);
                });
                const lossData = await lossTensor.data();
                lossTensor.dispose();
                testBatch.xs.dispose();
                testBatch.ys.dispose();

                const loss = lossData[0];
                if (!isNaN(loss) && isFinite(loss)) {
                    const acc = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, loss / 0.12)) * 100)));
                    setRetentionMap(prev => ({ ...prev, [targetTier]: acc }));
                }
            } else if (testBatch.xs) {
                testBatch.xs.dispose();
                testBatch.ys.dispose();
            }
        } catch (err) {
            console.warn("Retention eval error:", err);
        } finally {
            isEvaluatingRetentionRef.current = false;
        }
    }, []);

    const handleSweepAllRetention = async () => {
        const activeModel = modelRef.current;
        if (!activeModel || activeModel.isDisposed || isEvaluatingRetentionRef.current) return;
        isEvaluatingRetentionRef.current = true;
        try {
            const gSize = activeModel.config.gridSize;
            const updated = {};
            for (let t = 1; t <= NUM_TASKS; t++) {
                const testBatch = createDataset(12, t, gSize, customSandboxRef.current);
                if (testBatch.xs && !testBatch.xs.isDisposed && !activeModel.isDisposed) {
                    const lossTensor = tf.tidy(() => {
                        const pred = activeModel.predictInference(testBatch.xs, t);
                        return tf.losses.meanSquaredError(testBatch.ys, pred);
                    });
                    const lossData = await lossTensor.data();
                    lossTensor.dispose();
                    testBatch.xs.dispose();
                    testBatch.ys.dispose();
                    const loss = lossData[0];
                    if (!isNaN(loss) && isFinite(loss)) {
                        updated[t] = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, loss / 0.12)) * 100)));
                    }
                }
            }
            setRetentionMap(prev => ({ ...prev, ...updated }));
            showToast("Swept Retention Across All 21 Curriculum Tiers!");
        } finally {
            isEvaluatingRetentionRef.current = false;
        }
    };

    const handleManualGrowth = async () => { 
        if (modelRef.current && !modelRef.current.isDisposed && !isGrowingRef.current) {
            const prevLayers = modelRef.current.layers.length;
            isGrowingRef.current = true;
            const grew = await modelRef.current.grow(gameState.current.chunkSize, gameState.current.headRatio);
            isGrowingRef.current = false;
            if (grew) {
                if (modelRef.current.layers.length > prevLayers && optimizerRef.current) {
                    warmupOptimizer(modelRef.current, optimizerRef.current, gameState.current.tier, gameState.current.regStrength);
                }
                syncUI(); 
                showToast("Zero-Shock Neurogenesis: Added Synapses");
            } else {
                showToast("Max Layer Depth Reached");
            }
        }
    };
    
    const handleSleep = async () => { 
        if (modelRef.current && !modelRef.current.isDisposed && !isGrowingRef.current) { 
            isGrowingRef.current = true;
            const p = await modelRef.current.prune(gameState.current.pruneRate); 
            isGrowingRef.current = false;
            syncUI(); 
            showToast(p > 0 ? `Sleep Phase: Pruned ${p} Unmyelinated Synapses` : "Network Already Optimal"); 
        } 
    };

    const handleSetPonderSteps = (k) => {
        const targetK = Math.max(1, Math.min(MAX_PONDER_STEPS, k));
        const activeLayers = modelRef.current ? modelRef.current.layers.length : 1;
        if (modelRef.current && !modelRef.current.isDisposed) {
            modelRef.current.config.ponderSteps = targetK;
        }
        const clampedVizIdx = Math.min(gameState.current.vizBlockIndex || 0, Math.max(0, targetK * activeLayers - 1));
        gameState.current.ponderSteps = targetK;
        gameState.current.vizBlockIndex = clampedVizIdx;
        pendingVizSyncRef.current = true;
        setUiState(p => ({ 
            ...p, 
            ponderSteps: targetK,
            vizBlockIndex: clampedVizIdx
        }));
        refreshMemoryTelemetry();
        if (!gameState.current.isPlaying) {
            syncUI(null, clampedVizIdx);
        }
        showToast(`Pondering Depth: ${targetK}x (${targetK * activeLayers}L Effective Depth)`);
    };

    const handleSetReadoutMode = (mode) => {
        const targetMode = mode === 'vocab' ? 'vocab' : 'scalar';
        if (modelRef.current && !modelRef.current.isDisposed) {
            modelRef.current.config.readoutMode = targetMode;
        }
        gameState.current.readoutMode = targetMode;
        pendingVizSyncRef.current = true;
        setUiState(p => ({ ...p, readoutMode: targetMode }));
        if (!gameState.current.isPlaying) {
            syncUI();
        }
        showToast(targetMode === 'vocab' 
            ? `Symbolic Readout: ${gameState.current.activeVocab}/10 Classes Active` 
            : `Scalar Readout: 1D Continuous Head Active`);
    };

    const handleSetManifoldMode = (mode) => {
        const targetMode = mode === '1d' ? '1d' : '2d';
        if (modelRef.current && !modelRef.current.isDisposed) {
            modelRef.current.setManifoldMode(targetMode);
        }
        gameState.current.manifoldMode = targetMode;
        pendingVizSyncRef.current = true;
        setUiState(p => ({ ...p, manifoldMode: targetMode }));
        if (!gameState.current.isPlaying) {
            syncUI();
        }
        showToast(targetMode === '1d'
            ? "1D Sequence Manifold: Linear RoPE Active"
            : "2D Spatial Manifold: Axial 2D-RoPE Active");
    };

    const refreshSandboxDatasetsIfActive = useCallback((nextSandboxCfg) => {
        const gs = gameState.current;
        if (gs.tier !== 21 || !modelRef.current || modelRef.current.isDisposed) return;
        const gSize = modelRef.current.config.gridSize;
        if (gs.trainSet && gs.trainSet.xs && !gs.trainSet.xs.isDisposed) {
            gs.trainSet.xs.dispose();
            gs.trainSet.ys.dispose();
        }
        if (gs.valSet && gs.valSet.xs && !gs.valSet.xs.isDisposed) {
            gs.valSet.xs.dispose();
            gs.valSet.ys.dispose();
        }
        gs.trainSet = createDataset(gs.batchSize, 21, gSize, nextSandboxCfg);
        gs.valSet = createDataset(VAL_SET_SIZE, 21, gSize, nextSandboxCfg);
        pendingVizSyncRef.current = true;
        if (!gs.isPlaying) syncUI();
    }, [syncUI]);

    const handlePaintSandboxCell = (side, cellIdx) => {
        const gSize = uiState.gridSize;
        const len = gSize * gSize;
        updateCustomSandbox(prev => {
            const pairs = [...prev.pairs];
            const activeIdx = Math.max(0, Math.min(pairs.length - 1, prev.activePairIdx || 0));
            const curPair = { ...pairs[activeIdx] };
            const arr = fitGridToSize(side === 'input' ? curPair.input : curPair.target, len);
            arr[cellIdx] = prev.brushSymbol;
            if (side === 'input') curPair.input = arr;
            else curPair.target = arr;
            pairs[activeIdx] = curPair;
            const next = { ...prev, mode: 'pairs', pairs };
            if (side === 'input' && gameState.current.tier === 21) {
                setProbeInput(arr);
            }
            refreshSandboxDatasetsIfActive(next);
            return next;
        });
    };

    const handleActivateAndTrainSandbox = () => {
        const gSize = uiState.gridSize;
        const len = gSize * gSize;
        const sb = customSandboxRef.current;
        const activePair = sb.pairs[Math.max(0, Math.min(sb.pairs.length - 1, sb.activePairIdx || 0))] || sb.pairs[0];
        const newProbe = fitGridToSize(activePair.input, len);
        setProbeInput(newProbe);
        setupTier(21, true, null, newProbe);
        updateState({ isPlaying: true, status: "TRAINING" });
        showToast(`Activated & Training Tier 21 ([TASK_21]: ${sb.mode === 'pairs' ? `${sb.pairs.length} Few-Shot Pairs` : sb.mode.toUpperCase()})`);
    };

    const handleGrowVocab = async (amount = 2) => {
        const activeModel = modelRef.current;
        if (!activeModel || activeModel.isDisposed || isGrowingRef.current) return;
        isGrowingRef.current = true;
        const grew = await activeModel.growVocab(amount);
        isGrowingRef.current = false;
        if (grew) {
            const newV = activeModel.config.activeVocab;
            gameState.current.activeVocab = newV;
            pendingVizSyncRef.current = true;
            setUiState(p => ({ ...p, activeVocab: newV }));
            if (!gameState.current.isPlaying) {
                syncUI();
            }
            showToast(`Zero-Shock Vocab Expansion: ${newV}/10 Symbol Classes Unlocked!`);
        } else {
            showToast("Full 10-Symbol ARC Vocabulary Already Unlocked");
        }
    };

    const handleSelectVizBlock = (idx) => {
        gameState.current.vizBlockIndex = idx;
        pendingVizSyncRef.current = true;
        setUiState(p => ({ ...p, vizBlockIndex: idx }));
        if (!gameState.current.isPlaying) {
            syncUI(null, idx);
        }
    };
    
    const handleTogglePlay = () => updateState({ isPlaying: !gameState.current.isPlaying, status: !gameState.current.isPlaying ? "TRAINING" : "PAUSED" });
    const handleToggleAuto = () => updateState({ autoEvolve: !gameState.current.autoEvolve });
    const handleToggleReplay = () => updateState({ memoryReplay: !gameState.current.memoryReplay });
    const handleTogglePerf = () => updateState({ highPerf: !gameState.current.highPerf });
    
    const handlePixelClick = (idx) => { 
        const cur = probeInput[idx] || 0;
        const nextVal = uiState.colorMode === 'arc' ? (cur === 0 ? 9 : (cur === 9 ? 2 : (cur === 2 ? 1 : (cur === 1 ? 4 : 0)))) : (cur === 0 ? 9 : 0);
        const newProbe = [...probeInput]; 
        newProbe[idx] = nextVal; 
        setProbeInput(newProbe); 
        setSelectedToken(idx);
    };

    const handleRandomizeProbe = () => {
        const gSize = modelRef.current ? modelRef.current.config.gridSize : uiState.gridSize;
        const len = gSize * gSize;
        const newProbe = Array.from({ length: len }, () => Math.random() > 0.65 ? Math.floor(Math.random() * 9) + 1 : 0);
        setProbeInput(newProbe);
    };

    const handleClearProbe = () => {
        const gSize = modelRef.current ? modelRef.current.config.gridSize : uiState.gridSize;
        const len = gSize * gSize;
        setProbeInput(new Array(len).fill(0));
    };

    const handleOpenDnaModal = () => {
        if (gameState.current.isPlaying) {
            updateState({ isPlaying: false, status: "PAUSED" });
        }
        setShowDnaModal(true);
    };

    const getExportPayload = useCallback(async () => {
        if (!modelRef.current || modelRef.current.isDisposed) return null;
        await tf.nextFrame();
        const modelData = await modelRef.current.serialize();
        const optimizerData = await serializeOptimizerState(optimizerRef.current, modelRef.current);
        const data = { 
            tier: gameState.current.tier, 
            step: stepRef.current || uiState.step, 
            trainHistory: gameState.current.trainHistory, 
            valHistory: gameState.current.valHistory, 
            neuronHistory: gameState.current.neuronHistory,
            consolidatedHistory: gameState.current.consolidatedHistory,
            retentionMap: retentionMap,
            probeInput: probeInput,
            customSandbox: customSandboxRef.current,
            model: modelData,
            optimizer: optimizerData
        }; 
        const jsonString = JSON.stringify(data);
        const inspection = inspectDnaObject(data, jsonString.length);
        return { jsonString, inspection };
    }, [uiState.step, retentionMap, probeInput]);

    const handleQuickSave = async (existingJson = null) => {
        let jsonStr = existingJson;
        if (!jsonStr) {
            const res = await getExportPayload();
            jsonStr = res ? res.jsonString : null;
        }
        if (!jsonStr) return;
        try {
            localStorage.setItem('coral_brain_dna_slot', jsonStr);
            setHasSavedSlot(true);
            showToast("Saved to browser memory!");
        } catch(e) {
            showToast("LocalStorage full (~5MB cap); use Copy or Download .json!");
        }
    };

    const handleApplyImportedJson = async (rawContent) => {
        try {
            const data = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
            if (!data || !data.model) throw new Error("Invalid DNA Format");
            
            isHydratingRef.current = true;
            updateState({ isPlaying: false });

            if (modelRef.current) modelRef.current.dispose();
            if (optimizerRef.current) optimizerRef.current.dispose();
            
            const tempModel = new CoralModel({}, true);
            tempModel.hydrate(data.model);
            modelRef.current = tempModel;
            
            const hydratedCfg = tempModel.config;
            optimizerRef.current = tf.train.adam(gameState.current.learningRate); 
            
            const loadedTier = data.tier || 1;
            const loadedStep = data.step || 0;
            const loadedTrainHist = data.trainHistory || [];
            const loadedValHist = data.valHistory || [];

            warmupOptimizer(tempModel, optimizerRef.current, loadedTier, gameState.current.regStrength);

            let restoredOpt = false;
            if (data.optimizer) {
                restoredOpt = restoreOptimizerState(optimizerRef.current, tempModel, data.optimizer);
            }

            const activeN = tempModel.getTotalActiveNeurons();
            const consN = tempModel.getTotalConsolidatedNeurons();

            gameState.current.tier = loadedTier; 
            gameState.current.trainHistory = loadedTrainHist; 
            gameState.current.valHistory = loadedValHist; 
            gameState.current.neuronHistory = data.neuronHistory || new Array(loadedTrainHist.length).fill(activeN);
            gameState.current.consolidatedHistory = data.consolidatedHistory || new Array(loadedTrainHist.length).fill(consN);
            gameState.current.activeNeurons = activeN;
            gameState.current.consolidatedNeurons = consN;
            gameState.current.maxPossibleNeurons = tempModel.getMaxPossibleNeurons();
            gameState.current.vizBlockIndex = 0;
            stepRef.current = loadedStep; 
            lastStepCount.current = loadedStep;
            if (loadedValHist.length > 0) {
                lastValLossRef.current = loadedValHist[loadedValHist.length - 1];
            }
            if (data.retentionMap) {
                setRetentionMap(data.retentionMap);
            }
            if (data.customSandbox) {
                updateCustomSandbox(data.customSandbox);
            }
            
            const len = hydratedCfg.gridSize * hydratedCfg.gridSize;
            let newProbe = data.probeInput && data.probeInput.length === len ? data.probeInput : new Array(len).fill(0);
            if (!data.probeInput) {
                newProbe[0] = 9;
                if (len > 5) newProbe[5] = 6;
                if (len > 10) newProbe[10] = 9;
            }
            setProbeInput(newProbe);

            setUiState(prev => ({ 
                ...prev, 
                tier: loadedTier, 
                step: loadedStep, 
                status: "READY",
                activeNeurons: gameState.current.activeNeurons,
                consolidatedNeurons: gameState.current.consolidatedNeurons,
                maxPossibleNeurons: gameState.current.maxPossibleNeurons,
                maxBlocks: hydratedCfg.maxBlocks,
                maxHeads: hydratedCfg.maxHeads,
                dModel: hydratedCfg.dModel,
                gridSize: hydratedCfg.gridSize,
                configSize: hydratedCfg.size,
                ponderSteps: hydratedCfg.ponderSteps || 1,
                readoutMode: hydratedCfg.readoutMode || 'scalar',
                activeVocab: hydratedCfg.activeVocab || 4,
                manifoldMode: hydratedCfg.manifoldMode || '2d',
                vizBlockIndex: 0
            }));
            
            setupTier(loadedTier, true, {
                ...hydratedCfg,
                configSize: hydratedCfg.size,
                batchSize: gameState.current.batchSize,
                learningRate: gameState.current.learningRate,
                ponderSteps: hydratedCfg.ponderSteps || 1,
                readoutMode: hydratedCfg.readoutMode || 'scalar',
                activeVocab: hydratedCfg.activeVocab || 4,
                manifoldMode: hydratedCfg.manifoldMode || '2d'
            }, newProbe); 

            await syncUI(newProbe, 0); 
            refreshMemoryTelemetry(0);
            const paramsK = (tempModel.getTotalParameters() / 1000).toFixed(1);
            showToast(`Restored ${tempModel.layers.length}L • ${paramsK}K Params (${gameState.current.activeNeurons}N | ${hydratedCfg.ponderSteps || 1}x Ponder${restoredOpt ? ' + Adam' : ''})`);
        } catch(err) { 
            showToast(`Load Failed: ${err.message}`);
        } finally {
            setTimeout(() => {
                isHydratingRef.current = false;
            }, 250);
        }
    };

    const handleQuickLoad = async () => {
        const stored = localStorage.getItem('coral_brain_dna_slot');
        if (!stored) {
            showToast("No Quick-Save found");
            return;
        }
        await handleApplyImportedJson(stored);
    };

    const checkEvolution = (vLoss) => {
        const gs = gameState.current; 
        const activeModel = modelRef.current;
        if (!gs.autoEvolve || isGrowingRef.current || !activeModel || activeModel.isDisposed) return false;
        const currentTierIndex = TIERS.findIndex(t => t.id === gs.tier);
        const maxAutoTierIndex = Math.min(19, TIERS.length - 1); // Cap auto-evolution at Tier 20
        if (vLoss < gs.evoThreshold) { 
            activeModel.consolidateMasteredTask().then(() => {
                if (modelRef.current === activeModel && !activeModel.isDisposed) {
                    gs.consolidatedNeurons = activeModel.getTotalConsolidatedNeurons();
                }
            });
            setRetentionMap(prev => ({ ...prev, [gs.tier]: 100 }));

            if (currentTierIndex >= 0 && currentTierIndex < maxAutoTierIndex) { 
                const nextTier = TIERS[currentTierIndex + 1];
                showToast(`Tier ${gs.tier} Mastered & Myelinated! -> ${nextTier.name}`);
                setupTier(nextTier.id, true); 
                return true; 
            } 
            return false; 
        }
        if (vLoss > gs.evoThreshold * 3 && gs.valHistory.length % 20 === 0) { 
            if (activeModel.config.readoutMode === 'vocab' && (activeModel.config.activeVocab || 4) < MAX_VOCAB) {
                isGrowingRef.current = true;
                activeModel.growVocab(2).then(grewV => {
                    isGrowingRef.current = false;
                    if (grewV && modelRef.current === activeModel && !activeModel.isDisposed) {
                        const newV = activeModel.config.activeVocab;
                        gs.activeVocab = newV;
                        pendingVizSyncRef.current = true;
                        setUiState(p => ({ ...p, activeVocab: newV }));
                        showToast(`Auto-Evolution: Expanded Symbolic Vocab to ${newV}/10 Classes!`);
                    }
                });
                return false;
            }

            const currPonder = activeModel.config.ponderSteps || 1;
            const tierObj = TIERS.find(t => t.id === gs.tier);
            if (tierObj && tierObj.type === 'Logic' && currPonder < 2 && Math.random() < 0.5) {
                activeModel.config.ponderSteps = currPonder + 1;
                gs.ponderSteps = currPonder + 1;
                setUiState(p => ({ ...p, ponderSteps: currPonder + 1 }));
                showToast(`Adaptive Evolution: Activated ${currPonder + 1}x Pondering Loop`);
                return false;
            }

            const prevLayers = activeModel.layers.length;
            isGrowingRef.current = true;
            activeModel.grow(gs.chunkSize, gs.headRatio).then(grew => {
                isGrowingRef.current = false;
                if (grew && modelRef.current === activeModel && !activeModel.isDisposed) {
                    if (activeModel.layers.length > prevLayers && optimizerRef.current) {
                        warmupOptimizer(activeModel, optimizerRef.current, gs.tier, gs.regStrength);
                    }
                    gs.activeNeurons = activeModel.getTotalActiveNeurons(); 
                    gs.maxPossibleNeurons = activeModel.getMaxPossibleNeurons();
                    gs.status = "GROWING"; 
                }
            });
        } 
        else if (gs.valHistory.length > 100 && gs.valHistory.length % 150 === 0 && vLoss < gs.evoThreshold * 2) { 
            isGrowingRef.current = true;
            activeModel.prune(gs.pruneRate).then(pruned => {
                isGrowingRef.current = false;
                if (pruned > 0 && modelRef.current === activeModel && !activeModel.isDisposed) {
                    gs.activeNeurons = activeModel.getTotalActiveNeurons(); 
                    gs.status = "SLEEPING"; 
                }
            });
        }
        return false;
    };

    const trainStep = useCallback(async (myLoopId) => {
        if (myLoopId !== undefined && myLoopId !== loopIdRef.current) return;
        const currentLoopId = myLoopId !== undefined ? myLoopId : loopIdRef.current;

        const gs = gameState.current;
        const activeModel = modelRef.current;
        if (!activeModel || activeModel.isDisposed || !gs.isPlaying || gs.isTransitioning || isGrowingRef.current || isEvaluatingRetentionRef.current) { 
            if (gs.isPlaying && currentLoopId === loopIdRef.current) {
                animFrameRef.current = requestAnimationFrame(() => trainStep(currentLoopId)); 
            }
            return; 
        }

        if (isTrainingStepRef.current) return;
        isTrainingStepRef.current = true;

        try {
            const activeGridSize = activeModel.config.gridSize;
            if (stepRef.current % 15 === 0 || !gs.trainSet || !gs.trainSet.xs || gs.trainSet.xs.isDisposed) {
                if (gs.trainSet && gs.trainSet.xs && !gs.trainSet.xs.isDisposed) { gs.trainSet.xs.dispose(); gs.trainSet.ys.dispose(); }
                gs.trainSet = createDataset(gs.batchSize, gs.tier, activeGridSize, customSandboxRef.current);
            }

            let { xs: tX, ys: tY } = gs.trainSet; 
            let activeTrainTier = gs.tier;
            const { xs: vX, ys: vY } = gs.valSet || {};
            let doingReplay = false; 
            
            if (gs.memoryReplay && gs.tier > 1 && Math.random() < gs.replayRate) {
                const prevTierIndex = Math.floor(Math.random() * (TIERS.findIndex(t => t.id === gs.tier)));
                const prevTierId = TIERS[prevTierIndex].id;
                if (replayBatchRef.current) { 
                    if (replayBatchRef.current.xs && !replayBatchRef.current.xs.isDisposed) replayBatchRef.current.xs.dispose(); 
                    if (replayBatchRef.current.ys && !replayBatchRef.current.ys.isDisposed) replayBatchRef.current.ys.dispose(); 
                }
                replayBatchRef.current = createDataset(32, prevTierId, activeGridSize, customSandboxRef.current); 
                if (replayBatchRef.current.xs) { 
                    tX = replayBatchRef.current.xs; 
                    tY = replayBatchRef.current.ys; 
                    activeTrainTier = prevTierId;
                    doingReplay = true; 
                }
            }
            
            if (!tX || tX.isDisposed || !tY || tY.isDisposed) {
                if (gs.isPlaying && currentLoopId === loopIdRef.current) {
                    animFrameRef.current = requestAnimationFrame(() => trainStep(currentLoopId));
                }
                return;
            }

            if (doingReplay !== isReplayingRef.current) {
                isReplayingRef.current = doingReplay;
                setIsReplaying(doingReplay); 
            }
            const K = Math.max(1, activeModel.config.ponderSteps || 1);
            const ponderLrScale = 1.0 / Math.pow(K, 0.35);
            const effectiveLR = (doingReplay ? gs.learningRate * 0.75 : gs.learningRate) * ponderLrScale; 
            optimizerRef.current.learningRate = effectiveLR;

            frameCountRef.current++;
            const shouldValidate = (frameCountRef.current % (K > 1 ? 8 : 5) === 0) || (lastValLossRef.current === null);
            const safeCap = K >= 3 ? 1 : (K === 2 ? 2 : 6);
            const maxStepsThisFrame = gs.highPerf 
                ? Math.max(1, Math.min(6, Math.ceil(gs.simSpeed / K))) 
                : Math.min(safeCap, Math.max(1, Math.ceil(gs.simSpeed / K)));
            
            const lossTensor = tf.tidy(() => {
                let lastCost = null;
                const frameStart = performance.now();
                for (let i = 0; i < maxStepsThisFrame; i++) {
                    if (!gs.highPerf && i > 0 && (performance.now() - frameStart) > 8) break;
                    const hPrefix = K > 1 ? activeModel.computePonderPrefix(tX, activeTrainTier, null, K) : null;
                    const targetOneHot = activeModel.config.readoutMode === 'vocab' ? activeModel.computeVocabTargets(tY) : null;
                    const cost = optimizerRef.current.minimize(() => { 
                        return activeModel.computeTrainLoss(tX, tY, hPrefix, targetOneHot, activeTrainTier, null, K, gs.regStrength);
                    }, true, activeModel.getOrderedVariables()); 
                    if (hPrefix) hPrefix.dispose();
                    if (targetOneHot) targetOneHot.dispose();
                    if (lastCost) lastCost.dispose(); 
                    lastCost = cost; 
                    stepRef.current++;
                }
                return lastCost;
            });
            
            if (!lossTensor) { 
                if (gs.isPlaying && currentLoopId === loopIdRef.current) {
                    animFrameRef.current = requestAnimationFrame(() => trainStep(currentLoopId)); 
                }
                return; 
            }

            const currentLossData = await lossTensor.data();
            const currentLoss = currentLossData[0];
            lossTensor.dispose();

            let vLossVal = lastValLossRef.current;
            if (shouldValidate && vX && !vX.isDisposed && vY && !vY.isDisposed) {
                const vLossTensor = tf.tidy(() => {
                    const evalCount = K > 1 ? Math.min(32, vX.shape[0]) : vX.shape[0];
                    const subVX = evalCount < vX.shape[0] ? vX.slice([0, 0], [evalCount, -1]) : vX;
                    const subVY = evalCount < vY.shape[0] ? vY.slice([0, 0], [evalCount, -1]) : vY;
                    const vPred = activeModel.predictInference(subVX, gs.tier, null, K);
                    return tf.losses.meanSquaredError(subVY, vPred);
                });
                const vData = await vLossTensor.data();
                vLossVal = vData[0];
                lastValLossRef.current = vLossVal;
                vLossTensor.dispose();
            }
            
            if (!isNaN(currentLoss) && isFinite(currentLoss)) {
                if (!doingReplay) { 
                    if (gs.trainHistory.length > 2000) gs.trainHistory.shift(); 
                    if (gs.valHistory.length > 2000) gs.valHistory.shift(); 
                    if (gs.neuronHistory.length > 2000) gs.neuronHistory.shift();
                    if (gs.consolidatedHistory.length > 2000) gs.consolidatedHistory.shift();
                    gs.trainHistory.push(currentLoss); 
                    gs.valHistory.push(vLossVal); 
                    gs.neuronHistory.push(gs.activeNeurons);
                    gs.consolidatedHistory.push(gs.consolidatedNeurons);
                    gs.status = "TRAINING";
                    checkEvolution(vLossVal); 
                }

                if (stepRef.current % 35 === 0 && gs.tier > 1) {
                    await evaluateRetentionRoundRobin();
                }

                const now = Date.now();
                if (now - lastDrawTime.current > (1000 / FPS_LIMIT)) { 
                    const nowPerf = performance.now();
                    const elapsedSec = (nowPerf - lastTelemetryTime.current) / 1000;
                    if (elapsedSec >= 0.8) {
                        const sps = Math.round((stepRef.current - lastStepCount.current) / elapsedSec);
                        refreshMemoryTelemetry(sps);
                        lastTelemetryTime.current = nowPerf;
                        lastStepCount.current = stepRef.current;
                    }

                    if (gs.mainTab === 'telemetry' && !pendingVizSyncRef.current) {
                        gs.activeNeurons = activeModel.getTotalActiveNeurons();
                        gs.consolidatedNeurons = activeModel.getTotalConsolidatedNeurons();
                        gs.maxPossibleNeurons = activeModel.getMaxPossibleNeurons();
                    }

                    setUiState(prev => ({ 
                        ...prev, 
                        step: stepRef.current, 
                        status: doingReplay ? `REPLAY T${activeTrainTier}` : gs.status, 
                        activeNeurons: gs.activeNeurons,
                        consolidatedNeurons: gs.consolidatedNeurons,
                        maxPossibleNeurons: gs.maxPossibleNeurons,
                        ponderSteps: activeModel.config.ponderSteps || 1,
                        readoutMode: activeModel.config.readoutMode || 'scalar',
                        activeVocab: activeModel.config.activeVocab || 4,
                        manifoldMode: activeModel.config.manifoldMode || '2d'
                    })); 
                    lastDrawTime.current = now; 
                    if (pendingVizSyncRef.current || (gs.mainTab !== 'telemetry' && Math.random() < (K >= 3 ? 0.25 : 0.35))) {
                        pendingVizSyncRef.current = false;
                        await syncUI(); 
                    }
                }
                await tf.nextFrame(); 
                if (gs.isPlaying && currentLoopId === loopIdRef.current) {
                    animFrameRef.current = requestAnimationFrame(() => trainStep(currentLoopId));
                }
            } else { 
                if (gs.trainSet && gs.trainSet.xs && !gs.trainSet.xs.isDisposed) {
                    gs.trainSet.xs.dispose();
                    gs.trainSet.ys.dispose();
                }
                gs.trainSet = createDataset(gs.batchSize, gs.tier, activeGridSize, customSandboxRef.current);
                await tf.nextFrame();
                if (gs.isPlaying && currentLoopId === loopIdRef.current) {
                    animFrameRef.current = requestAnimationFrame(() => trainStep(currentLoopId));
                }
            }
        } catch (error) { 
            console.warn("Training step caught error:", error);
            showToast(`Train Error: ${error && error.message ? error.message : String(error)}`);
            updateState({ isPlaying: false, status: "PAUSED" }); 
        } finally {
            isTrainingStepRef.current = false;
        }
    }, [syncUI, evaluateRetentionRoundRobin, refreshMemoryTelemetry]);

    useEffect(() => { 
        if (uiState.isPlaying) { 
            loopIdRef.current += 1;
            const activeId = loopIdRef.current;
            animFrameRef.current = requestAnimationFrame(() => trainStep(activeId)); 
        } else { 
            loopIdRef.current += 1;
            cancelAnimationFrame(animFrameRef.current); 
        } 
        return () => {
            cancelAnimationFrame(animFrameRef.current); 
        };
    }, [uiState.isPlaying, trainStep]);

    const vLoss = gameState.current.valHistory[gameState.current.valHistory.length-1] ?? 0.25;
    const currentTier = TIERS.find(t => t.id === uiState.tier) || TIERS[0];
    const secondaryTierObj = TIERS.find(t => t.id === blendConfig.secondaryTier) || TIERS[1];
    const masteryStart = 0.20; 
    const masteryEnd = gameState.current.evoThreshold; 
    let progress = 0; 
    if (gameState.current.valHistory.length > 0 && vLoss < masteryStart) { 
        progress = ((masteryStart - vLoss) / (masteryStart - masteryEnd)) * 100; 
    }
    progress = Math.max(0, Math.min(100, progress));

    const expectedTarget = useMemo(() => {
        const gSize = uiState.gridSize;
        const len = gSize * gSize;
        const safeProbe = probeInput.length === len ? probeInput : new Array(len).fill(0);
        const evalTierFn = (tObj) => {
            if (tObj.id === 21) return evalCustomTarget(safeProbe, gSize, customSandbox);
            return safeProbe.map((_, idx) => tObj.fn(safeProbe, idx, Math.floor(idx / gSize), idx % gSize, gSize, gSize));
        };
        const t1Out = evalTierFn(currentTier);
        if (blendConfig.enabled && blendConfig.alpha > 0) {
            const t2Out = evalTierFn(secondaryTierObj);
            return t1Out.map((v1, idx) => v1 * (1 - blendConfig.alpha) + t2Out[idx] * blendConfig.alpha);
        }
        return t1Out;
    }, [probeInput, currentTier, secondaryTierObj, blendConfig, uiState.gridSize, customSandbox]);

    const tokenAttentionMap = useMemo(() => {
        if (!snapshots || !snapshots.attention || snapshots.attention.length === 0) return null;
        const safeVizIdx = Math.min(uiState.vizBlockIndex, Math.max(0, snapshots.attention.length - 1));
        const blkAttn = snapshots.attention[safeVizIdx];
        if (!blkAttn || !blkAttn.data) return null;
        const seq = blkAttn.seqLen;
        const headIdx = 0; 
        const offset = (headIdx * seq * seq) + (selectedToken * seq);
        const weights = [];
        for(let c=0; c<seq; c++) {
            weights.push(blkAttn.data[offset + c] || 0);
        }
        return weights;
    }, [snapshots, uiState.vizBlockIndex, selectedToken]);

    const selectedTokenVocabProbs = useMemo(() => {
        if (!snapshots || !snapshots.vocabProbs || uiState.readoutMode !== 'vocab') return null;
        const V = snapshots.activeVocab || uiState.activeVocab || 4;
        const totalTokens = uiState.gridSize * uiState.gridSize;
        const tokIdx = Math.max(0, Math.min(totalTokens - 1, selectedToken || 0));
        const offset = tokIdx * V;
        const probs = [];
        for (let c = 0; c < V; c++) {
            const digit = VOCAB_SLOT_DIGITS[c];
            probs.push({
                slot: c,
                label: VOCAB_SLOT_LABELS[c],
                digit,
                color: ARC_PALETTE[digit],
                prob: snapshots.vocabProbs[offset + c] || 0
            });
        }
        return probs;
    }, [snapshots, uiState.readoutMode, uiState.activeVocab, uiState.gridSize, selectedToken]);

    return (
        <div className="min-h-screen p-3 md:p-6 max-w-6xl mx-auto font-sans text-gray-200 flex flex-col no-select relative">
            {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
            
            <DnaVaultModal 
                isOpen={showDnaModal} 
                onClose={() => setShowDnaModal(false)}
                onExport={getExportPayload}
                onImport={handleApplyImportedJson}
                onQuickSave={handleQuickSave}
                onQuickLoad={handleQuickLoad}
                hasSavedSlot={hasSavedSlot}
                toast={showToast}
            />

            {showSettings && (
                <div className="absolute top-20 right-4 z-50 w-84 glass-panel rounded-2xl p-4 shadow-2xl max-h-[84vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                        <h3 className="text-xs font-bold text-gray-200 flex items-center gap-2"><Settings size={14}/> ARCHITECT HYPERPARAMETERS</h3>
                        <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
                    </div>
                    <div className="space-y-3.5 text-xs">
                        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
                            <div className="flex justify-between mb-1"><span className="text-white font-bold">GRID RESOLUTION</span><span className="text-emerald-400 font-mono">{uiState.gridSize}x{uiState.gridSize} ({uiState.gridSize**2} tokens)</span></div>
                            <input type="range" min="4" max="8" step="1" value={uiState.gridSize} onChange={(e) => updateState({ gridSize: parseInt(e.target.value) })} />
                            <p className="text-[9px] text-amber-400/80 mt-1">2D-RoPE spatial manifold + [TASK_ID] slot.</p>
                        </div>
                        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
                            <div className="flex justify-between mb-1"><span className="text-white font-bold">PONDER DEPTH (THINKING TIME)</span><span className="text-sky-300 font-mono">{uiState.ponderSteps}x Loop ({uiState.ponderSteps * (telemetry.layers || 1)}L Eff)</span></div>
                            <input type="range" min="1" max="4" step="1" value={uiState.ponderSteps} onChange={(e) => handleSetPonderSteps(parseInt(e.target.value))} />
                            <p className="text-[9px] text-sky-400/80 mt-1">Universal Transformer recurrence with prefix-detached BPTT.</p>
                        </div>
                        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
                            <div className="flex justify-between mb-1"><span className="text-white font-bold">ACTIVE SYMBOL VOCABULARY (V)</span><span className="text-purple-300 font-mono">{uiState.activeVocab} / 10 Classes</span></div>
                            <input type="range" min="2" max="10" step="1" value={uiState.activeVocab} onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (modelRef.current && !modelRef.current.isDisposed) modelRef.current.config.activeVocab = v;
                                updateState({ activeVocab: v });
                                pendingVizSyncRef.current = true;
                                if (!gameState.current.isPlaying) syncUI();
                            }} />
                            <p className="text-[9px] text-purple-400/80 mt-1">Slices W_vocab[:, 0:V] to save FLOPs on binary/low-symbol tiers.</p>
                        </div>
                        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
                            <div className="flex justify-between mb-1"><span className="text-white font-bold">MODEL WIDTH (dModel)</span><span className="text-emerald-300 font-mono">{uiState.dModel}</span></div>
                            <input type="range" min="16" max="256" step="16" value={uiState.dModel} onChange={(e) => updateState({ dModel: parseInt(e.target.value) })} />
                        </div>
                        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
                            <div className="flex justify-between mb-1"><span className="text-white font-bold">MAX ATTENTION HEADS</span><span className="text-sky-300 font-mono">{uiState.maxHeads} (dim: {Math.floor(uiState.dModel/uiState.maxHeads)})</span></div>
                            <input type="range" min="1" max="8" step="1" value={uiState.maxHeads} onChange={(e) => updateState({ maxHeads: parseInt(e.target.value) })} />
                        </div>
                        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
                            <div className="flex justify-between mb-1"><span className="text-white font-bold">MAX FFN NEURONS / LAYER</span><span className="text-amber-300 font-mono">{uiState.configSize}</span></div>
                            <input type="range" min="64" max="512" step="64" value={uiState.configSize} onChange={(e) => updateState({ configSize: parseInt(e.target.value) })} />
                        </div>
                        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
                            <div className="flex justify-between mb-1"><span className="text-white font-bold">MAX LAYERS (DEPTH)</span><span className="text-pink-400 font-mono">{uiState.maxBlocks}</span></div>
                            <input type="range" min="1" max="6" step="1" value={uiState.maxBlocks} onChange={(e) => { const v = parseInt(e.target.value); updateState({ maxBlocks: v }); if(modelRef.current) modelRef.current.config.maxBlocks = v; }} />
                        </div>

                        <div className="border-t border-gray-800 pt-2 space-y-3">
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">LEARNING RATE</span><span className="text-emerald-400 font-mono">{uiState.learningRate}</span></div><input type="range" min="0.0005" max="0.02" step="0.0005" value={uiState.learningRate} onChange={(e) => updateState({ learningRate: parseFloat(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">BATCH SIZE</span><span className="text-sky-400 font-mono">{uiState.batchSize}</span></div><input type="range" min="16" max="512" step="16" value={uiState.batchSize} onChange={(e) => updateState({ batchSize: parseInt(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">GROWTH CHUNK SIZE</span><span className="text-amber-400 font-mono">+{uiState.chunkSize} N</span></div><input type="range" min="4" max="64" step="4" value={uiState.chunkSize} onChange={(e) => updateState({ chunkSize: parseInt(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">SIMULATION SPEED</span><span className="text-purple-400 font-mono">{uiState.simSpeed}x</span></div><input type="range" min="1" max="100" step="1" value={uiState.simSpeed} onChange={(e) => updateState({ simSpeed: parseInt(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">EVO THRESHOLD (100%)</span><span className="text-orange-400 font-mono">{uiState.evoThreshold}</span></div><input type="range" min="0.001" max="0.03" step="0.001" value={uiState.evoThreshold} onChange={(e) => updateState({ evoThreshold: parseFloat(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">L2 REGULARIZATION</span><span className="text-cyan-400 font-mono">{uiState.regStrength}</span></div><input type="range" min="0.000001" max="0.0001" step="0.000005" value={uiState.regStrength} onChange={(e) => updateState({ regStrength: parseFloat(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">NEURONS PER HEAD RATIO</span><span className="text-cyan-400 font-mono">{uiState.headRatio}:1</span></div><input type="range" min="8" max="64" step="8" value={uiState.headRatio} onChange={(e) => updateState({ headRatio: parseInt(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">SLEEP PRUNE RATE</span><span className="text-red-400 font-mono">{Math.round(uiState.pruneRate * 100)}%</span></div><input type="range" min="0.05" max="0.35" step="0.05" value={uiState.pruneRate} onChange={(e) => updateState({ pruneRate: parseFloat(e.target.value) })} /></div>
                            <div><div className="flex justify-between mb-1"><span className="text-gray-400">MEMORY REPLAY PROB</span><span className="text-purple-400 font-mono">{Math.round(uiState.replayRate * 100)}%</span></div><input type="range" min="0.01" max="0.35" step="0.01" value={uiState.replayRate} onChange={(e) => updateState({ replayRate: parseFloat(e.target.value) })} /></div>
                        </div>
                        <div className="pt-2 border-t border-gray-800">
                            <button onClick={handleTogglePerf} className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${uiState.highPerf ? 'bg-red-950/40 text-red-400 border-red-700/60 shadow-lg shadow-red-950/50' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                {uiState.highPerf ? '🚀 TURBO UNLOCKED (MAX GPU)' : '⚡ SAFE FRAME BUDGET (12ms)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3.5 border-b border-gray-800/80 pb-3.5 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                        <Brain size={28} className="text-amber-500" /> C.O.R.A.L. <span className="text-xs font-mono text-sky-400 font-bold bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/50">v15.3 SOTA</span>
                    </h1>
                    <div className="text-[10px] font-mono text-gray-400 mt-1.5 flex flex-wrap items-center gap-2">
                        <button onClick={handleCycleBackend} className="cursor-pointer hover:underline text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-800/40" title="Click to cycle backend">
                            ⚡ {uiState.backend.toUpperCase()} (Switch)
                        </button>
                        <span>•</span>
                        <span className="text-cyan-300 font-bold bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-800/40" title="Active Layers & Total Float32 Model Parameters">
                            {telemetry.layers}L ({uiState.ponderSteps}x Ponder • {uiState.manifoldMode.toUpperCase()}) • {telemetry.paramsK}K Params ({uiState.activeNeurons}N | {uiState.readoutMode === 'vocab' ? `${uiState.activeVocab}V` : '1D'})
                        </span>
                        <span>•</span>
                        <span className="text-purple-300 font-bold">{telemetry.sps} Steps/s</span>
                        <span>•</span>
                        <span className="text-amber-300 font-mono" title="True GPU float32 Tensors & Binary VRAM">{telemetry.tensors} Tensors ({telemetry.memoryMb}MB VRAM)</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => setShowInfo(true)} className="p-2 rounded-lg border bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-all" title="SOTA Architecture Guide"><Info size={16}/></button>
                    <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg border transition-all ${showSettings ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`} title="Hyperparameters"><Settings size={16}/></button>
                    <div className="w-[1px] h-6 bg-gray-800 mx-0.5"></div>
                    <button onClick={handleToggleReplay} className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${uiState.memoryReplay ? 'bg-pink-900/40 border-pink-500/50 text-pink-300' : 'bg-gray-900 border-gray-800 text-gray-500'} ${isReplaying ? 'replay-active' : ''}`}><BookOpen size={13}/> REPLAY</button>
                    <button onClick={handleToggleAuto} className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${uiState.autoEvolve ? 'bg-purple-950/40 border-purple-500/50 text-purple-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>{uiState.autoEvolve ? <Unlock size={13}/> : <Lock size={13}/>} AUTO</button>
                    <button onClick={handleTogglePlay} className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${uiState.isPlaying ? 'bg-red-950/50 text-red-400 border border-red-500/50' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/50'}`}>{uiState.isPlaying ? <Pause size={14}/> : <Play size={14}/>} {uiState.isPlaying ? 'PAUSE' : 'TRAIN'}</button>
                    <button onClick={() => handleReset()} className="p-2 bg-gray-900 hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-gray-800 rounded-lg transition-all" title="Reset Brain"><RotateCcw size={16}/></button>
                    <button onClick={handleOpenDnaModal} className="px-3 py-2 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 rounded-lg text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow transition-all" title="Brain DNA Vault">
                        <Database size={14}/> DNA VAULT
                    </button>
                </div>
            </div>

            {/* PERSISTENT TRI-WORKSPACE NAVIGATION BAR (NON-BLOCKING REAL-TIME TABS) */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-[#08080c] p-1.5 rounded-2xl border border-gray-800/80 shadow-inner">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                    <button
                        onClick={() => {
                            updateState({ mainTab: 'studio' });
                            pendingVizSyncRef.current = true;
                            if (!gameState.current.isPlaying) syncUI();
                        }}
                        className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${uiState.mainTab === 'studio' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow' : 'text-gray-400 hover:text-gray-200 border border-transparent'}`}
                    >
                        <Brain size={14} className={uiState.mainTab === 'studio' ? 'text-amber-400' : 'text-gray-500'}/>
                        CORTEX STUDIO
                    </button>
                    <button
                        onClick={() => updateState({ mainTab: 'telemetry' })}
                        className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${uiState.mainTab === 'telemetry' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow' : 'text-gray-400 hover:text-gray-200 border border-transparent'}`}
                    >
                        <Activity size={14} className={uiState.mainTab === 'telemetry' ? 'text-emerald-400' : 'text-gray-500'}/>
                        TELEMETRY &amp; NEUROGENESIS DECK
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/60 text-emerald-400 border border-emerald-800/50">
                            VAL: {Number(vLoss || 0).toFixed(4)}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            updateState({ mainTab: 'sandbox' });
                            pendingVizSyncRef.current = true;
                            if (!gameState.current.isPlaying) syncUI();
                        }}
                        className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${uiState.mainTab === 'sandbox' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow' : 'text-gray-400 hover:text-gray-200 border border-transparent'}`}
                    >
                        <Palette size={14} className={uiState.mainTab === 'sandbox' ? 'text-pink-400' : 'text-gray-500'}/>
                        CUSTOM TASK SANDBOX (T21)
                    </button>
                </div>

                <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-black/50 rounded-xl border border-gray-800/80 text-[10px] font-mono">
                    <span className="text-gray-400">TIER <b className="text-amber-300">T{uiState.tier}: {currentTier.name}</b></span>
                    <span>•</span>
                    <span className="text-gray-400">MASTERY <b className="text-emerald-400">{Math.round(progress)}%</b></span>
                    <span>•</span>
                    <span className="text-gray-400">NEURONS <b className="text-amber-400">{uiState.activeNeurons}N ({uiState.consolidatedNeurons}🔒)</b></span>
                    <span>•</span>
                    <span className="text-gray-400">STATUS <b className="text-sky-300">{uiState.status}</b></span>
                </div>
            </div>

            {msg && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 border border-amber-500/50 text-amber-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 animate-pulse"><Zap size={14} className="text-amber-400"/> {msg}</div>}

            {uiState.mainTab === 'studio' ? (
                <StudioWorkspace
                    uiState={uiState}
                    updateState={updateState}
                    telemetry={telemetry}
                    progress={progress}
                    vLoss={vLoss}
                    retentionMap={retentionMap}
                    setupTier={setupTier}
                    handleManualGrowth={handleManualGrowth}
                    handleSleep={handleSleep}
                    handleSetPonderSteps={handleSetPonderSteps}
                    handleSetReadoutMode={handleSetReadoutMode}
                    handleGrowVocab={handleGrowVocab}
                    handleSetManifoldMode={handleSetManifoldMode}
                    blendConfig={blendConfig}
                    setBlendConfig={setBlendConfig}
                    probeInput={probeInput}
                    selectedToken={selectedToken}
                    setSelectedToken={setSelectedToken}
                    tokenAttentionMap={tokenAttentionMap}
                    snapshots={snapshots}
                    handleSelectVizBlock={handleSelectVizBlock}
                    handleRandomizeProbe={handleRandomizeProbe}
                    handleClearProbe={handleClearProbe}
                    expectedTarget={expectedTarget}
                    selectedTokenVocabProbs={selectedTokenVocabProbs}
                    handlePixelClick={handlePixelClick}
                />
            ) : uiState.mainTab === 'telemetry' ? (
                <TelemetryWorkspace
                    uiState={uiState}
                    currentTier={currentTier}
                    progress={progress}
                    vLoss={vLoss}
                    telemetry={telemetry}
                    snapshots={snapshots}
                    gameState={gameState}
                    retentionMap={retentionMap}
                    handleManualGrowth={handleManualGrowth}
                    handleSleep={handleSleep}
                    handleGrowVocab={handleGrowVocab}
                    handleResetGraph={handleResetGraph}
                    handleSweepAllRetention={handleSweepAllRetention}
                    setupTier={setupTier}
                />
            ) : (
                <SandboxWorkspace
                    uiState={uiState}
                    customSandbox={customSandbox}
                    updateCustomSandbox={updateCustomSandbox}
                    handleActivateAndTrainSandbox={handleActivateAndTrainSandbox}
                    isPaintingRef={isPaintingRef}
                    handlePaintSandboxCell={handlePaintSandboxCell}
                    snapshots={snapshots}
                    refreshSandboxDatasetsIfActive={refreshSandboxDatasetsIfActive}
                    handleSetManifoldMode={handleSetManifoldMode}
                    showToast={showToast}
                    setProbeInput={setProbeInput}
                />
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
})();
