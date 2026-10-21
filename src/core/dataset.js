// C.O.R.A.L. Dataset & Custom Sandbox Synthesis
(() => {
window.CORAL = window.CORAL || {};

const createDefaultSandboxPairs = (gridSize = 4) => {
    const len = gridSize * gridSize;
    const p1In = new Array(len).fill(0);
    const p1Out = new Array(len).fill(0);
    const rMid = Math.floor(gridSize / 2);
    const cMid = Math.floor(gridSize / 2);
    p1In[rMid * gridSize + cMid] = 2;
    p1Out[rMid * gridSize + cMid] = 2;
    if (rMid > 0) p1Out[(rMid - 1) * gridSize + cMid] = 8;
    if (rMid < gridSize - 1) p1Out[(rMid + 1) * gridSize + cMid] = 8;
    if (cMid > 0) p1Out[rMid * gridSize + (cMid - 1)] = 8;
    if (cMid < gridSize - 1) p1Out[rMid * gridSize + (cMid + 1)] = 8;

    const p2In = new Array(len).fill(0);
    const p2Out = new Array(len).fill(0);
    for (let k = 0; k < gridSize; k++) {
        p2In[k * gridSize + 0] = 4;
        p2Out[k * gridSize + (gridSize - 1)] = 4;
    }

    const p3In = new Array(len).fill(0);
    const p3Out = new Array(len).fill(0);
    p3In[0] = 9;
    p3In[gridSize - 1] = 1;
    p3Out[(gridSize - 1) * gridSize + (gridSize - 1)] = 9;
    p3Out[(gridSize - 1) * gridSize + 0] = 1;

    return [
        { name: "Cross Bloom", input: p1In, target: p1Out },
        { name: "Edge Teleport", input: p2In, target: p2Out },
        { name: "Corner Flip", input: p3In, target: p3Out }
    ];
};

const fitGridToSize = (arr, targetLen) => {
    if (!arr || arr.length === targetLen) return arr ? [...arr] : new Array(targetLen).fill(0);
    const res = new Array(targetLen).fill(0);
    const copyLen = Math.min(arr.length, targetLen);
    for (let i = 0; i < copyLen; i++) res[i] = arr[i];
    return res;
};

const evalCustomTarget = (grid, gridSize, sandboxCfg) => {
    const len = gridSize * gridSize;
    const cfg = sandboxCfg || { mode: 'pairs', pairs: createDefaultSandboxPairs(gridSize) };
    const mode = cfg.mode || 'pairs';

    if (mode === 'preset_rot90') {
        const out = new Array(len).fill(0);
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                out[r * gridSize + c] = grid[(gridSize - 1 - c) * gridSize + r] || 0;
            }
        }
        return out;
    }
    if (mode === 'preset_rule110') {
        const out = new Array(len).fill(0);
        for (let idx = 0; idx < len; idx++) {
            const p = (grid[(idx - 1 + len) % len] || 0) > 0 ? 1 : 0;
            const q = (grid[idx] || 0) > 0 ? 1 : 0;
            const rBit = (grid[(idx + 1) % len] || 0) > 0 ? 1 : 0;
            const pattern = (p << 2) | (q << 1) | rBit;
            out[idx] = ((110 >> pattern) & 1) ? 9 : 0;
        }
        return out;
    }
    if (mode === 'preset_swap') {
        const swapMap = { 1: 2, 2: 1, 3: 4, 4: 3, 8: 9, 9: 8 };
        return grid.map(v => {
            const d = Math.round(v);
            return swapMap[d] !== undefined ? swapMap[d] : d;
        });
    }

    const pairs = (cfg.pairs && cfg.pairs.length > 0) ? cfg.pairs : createDefaultSandboxPairs(gridSize);
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
        const pIn = fitGridToSize(pairs[pIdx].input, len);
        let dist = 0;
        for (let i = 0; i < len; i++) {
            const diff = (grid[i] || 0) - (pIn[i] || 0);
            dist += diff * diff;
        }
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = pIdx;
        }
    }
    return fitGridToSize(pairs[bestIdx].target, len);
};

const createDataset = (size, tierId, gridSize, customSandboxCfg = null) => {
    if (!tf.getBackend()) return { xs: null, ys: null };
    const len = gridSize * gridSize;
    const xVals = [];
    const yVals = [];

    if (tierId === 21) {
        const cfg = customSandboxCfg || {
            mode: 'pairs',
            augColorPermute: true,
            augSpatialShift: true,
            pairs: createDefaultSandboxPairs(gridSize)
        };
        const mode = cfg.mode || 'pairs';

        if (mode !== 'pairs') {
            for (let i = 0; i < size; i++) {
                const grid = Array.from({ length: len }, () => (Math.random() > 0.55 ? Math.floor(Math.random() * 9) + 1 : 0));
                const target = evalCustomTarget(grid, gridSize, cfg);
                xVals.push(grid.map(v => v / 10));
                yVals.push(target.map(v => v / 10));
            }
        } else {
            const pairs = (cfg.pairs && cfg.pairs.length > 0) ? cfg.pairs : createDefaultSandboxPairs(gridSize);
            for (let i = 0; i < size; i++) {
                const pair = pairs[i % pairs.length];
                let inGrid = fitGridToSize(pair.input, len);
                let tgtGrid = fitGridToSize(pair.target, len);

                const doAug = Math.random() < 0.60;
                if (doAug && cfg.augSpatialShift) {
                    const dr = Math.floor(Math.random() * gridSize);
                    const dc = Math.floor(Math.random() * gridSize);
                    const sIn = new Array(len).fill(0);
                    const sTgt = new Array(len).fill(0);
                    for (let r = 0; r < gridSize; r++) {
                        for (let c = 0; c < gridSize; c++) {
                            const nr = (r + dr) % gridSize;
                            const nc = (c + dc) % gridSize;
                            sIn[nr * gridSize + nc] = inGrid[r * gridSize + c];
                            sTgt[nr * gridSize + nc] = tgtGrid[r * gridSize + c];
                        }
                    }
                    inGrid = sIn;
                    tgtGrid = sTgt;
                }
                if (doAug && cfg.augColorPermute) {
                    const perm = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                    for (let k = 9; k > 1; k--) {
                        const j = 1 + Math.floor(Math.random() * k);
                        const tmp = perm[k];
                        perm[k] = perm[j];
                        perm[j] = tmp;
                    }
                    inGrid = inGrid.map(v => perm[Math.max(0, Math.min(9, Math.round(v)))]);
                    tgtGrid = tgtGrid.map(v => perm[Math.max(0, Math.min(9, Math.round(v)))]);
                }
                xVals.push(inGrid.map(v => v / 10));
                yVals.push(tgtGrid.map(v => v / 10));
            }
        }

        return {
            xs: tf.tensor2d(xVals, [size, len]),
            ys: tf.tensor2d(yVals, [size, len]),
            tierId
        };
    }

    const tier = (window.CORAL.TIERS || []).find(t => t.id === tierId) || window.CORAL.TIERS[0];
    for (let i = 0; i < size; i++) {
        const grid = Array.from({ length: len }, () => Math.floor(Math.random() * 10));
        const target = new Array(len).fill(0);
        for (let idx = 0; idx < len; idx++) {
            target[idx] = tier.fn(grid, idx, Math.floor(idx/gridSize), idx%gridSize, gridSize, gridSize);
        }
        xVals.push(grid.map(v => v / 10));
        yVals.push(target.map(v => v / 10));
    }
    return { 
        xs: tf.tensor2d(xVals, [size, len]), 
        ys: tf.tensor2d(yVals, [size, len]),
        tierId
    };
};

Object.assign(window.CORAL, {
    createDefaultSandboxPairs,
    fitGridToSize,
    evalCustomTarget,
    createDataset
});
})();
