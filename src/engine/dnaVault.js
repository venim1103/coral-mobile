// C.O.R.A.L. DNA Vault & Adam Momentum Serializer
(() => {
window.CORAL = window.CORAL || {};

const serializeOptimizerState = async (opt, model) => {
    if (!opt || !model || model.isDisposed) return null;
    try {
        const vars = model.getOrderedVariables();
        const firstMMap = opt.accumulatedFirstMoment;
        const secondMMap = opt.accumulatedSecondMoment;
        const mList = [];
        const vList = [];

        const findMomentTensor = (mapObj, vName) => {
            if (!mapObj) return null;
            if (Array.isArray(mapObj)) {
                const entry = mapObj.find(e => e && e.originalName === vName);
                return entry ? entry.variable : null;
            }
            if (typeof mapObj === 'object' && mapObj[vName]) {
                return mapObj[vName].variable || mapObj[vName];
            }
            return null;
        };

        for (let i = 0; i < vars.length; i++) {
            const vName = vars[i].name;
            const mVar = findMomentTensor(firstMMap, vName);
            const vVar = findMomentTensor(secondMMap, vName);
            mList.push(mVar && !mVar.isDisposed ? Array.from(await mVar.data()) : null);
            vList.push(vVar && !vVar.isDisposed ? Array.from(await vVar.data()) : null);
        }

        const accBeta1 = (opt.accBeta1 && !opt.accBeta1.isDisposed) ? (await opt.accBeta1.data())[0] : null;
        const accBeta2 = (opt.accBeta2 && !opt.accBeta2.isDisposed) ? (await opt.accBeta2.data())[0] : null;

        return { accBeta1, accBeta2, mList, vList };
    } catch (e) {
        return null;
    }
};

const restoreOptimizerState = (opt, model, optData) => {
    if (!opt || !model || model.isDisposed || !optData) return false;
    try {
        const varsV153 = model.getOrderedVariables('v15.3');
        const varsV151 = model.getOrderedVariables('v15.1');
        const varsV150 = model.getOrderedVariables('v15.0');
        const varsV149 = model.getOrderedVariables('v14.9');
        const mListLen = optData.mList ? optData.mList.length : 0;

        let vars = varsV153;
        if (mListLen === varsV149.length) vars = varsV149;
        else if (mListLen === varsV150.length) vars = varsV150;
        else if (mListLen === varsV151.length) vars = varsV151;

        const firstMMap = opt.accumulatedFirstMoment;
        const secondMMap = opt.accumulatedSecondMoment;
        let restoredCount = 0;

        const findMomentTensor = (mapObj, vName) => {
            if (!mapObj) return null;
            if (Array.isArray(mapObj)) {
                const entry = mapObj.find(e => e && e.originalName === vName);
                return entry ? entry.variable : null;
            }
            if (typeof mapObj === 'object' && mapObj[vName]) {
                return mapObj[vName].variable || mapObj[vName];
            }
            return null;
        };

        tf.tidy(() => {
            if (optData.accBeta1 !== null && optData.accBeta1 !== undefined && opt.accBeta1 && !opt.accBeta1.isDisposed) {
                opt.accBeta1.assign(tf.scalar(optData.accBeta1));
            }
            if (optData.accBeta2 !== null && optData.accBeta2 !== undefined && opt.accBeta2 && !opt.accBeta2.isDisposed) {
                opt.accBeta2.assign(tf.scalar(optData.accBeta2));
            }

            for (let i = 0; i < vars.length; i++) {
                const v = vars[i];
                const expectedLen = v.shape.reduce((a, b) => a * b, 1);
                let mArr = optData.mList && optData.mList[i];
                let vArr = optData.vList && optData.vList[i];

                if (v === model.taskEmbeddings && mArr && mArr.length === 20 * model.config.dModel && window.CORAL.NUM_TASKS === 21) {
                    const padZeros = new Array(model.config.dModel).fill(0);
                    mArr = [...mArr, ...padZeros];
                    if (vArr && vArr.length === 20 * model.config.dModel) {
                        vArr = [...vArr, ...padZeros];
                    }
                }

                if (mArr && mArr.length === expectedLen) {
                    const mVar = findMomentTensor(firstMMap, v.name);
                    if (mVar && !mVar.isDisposed) {
                        mVar.assign(tf.tensor(mArr, v.shape));
                        restoredCount++;
                    }
                }
                if (vArr && vArr.length === expectedLen) {
                    const vVar = findMomentTensor(secondMMap, v.name);
                    if (vVar && !vVar.isDisposed) {
                        vVar.assign(tf.tensor(vArr, v.shape));
                    }
                }
            }
        });
        return restoredCount > 0;
    } catch (e) {
        return false;
    }
};

const inspectDnaObject = (parsed, rawLength = 0) => {
    try {
        if (!parsed || !parsed.model) return null;
        const m = parsed.model || {};
        const topo = m.topology || [];
        const numLayers = topo.length;
        const activeN = m.activeNeurons || 0;
        let paramCount = m.totalParameters || 0;
        if (!paramCount) {
            topo.forEach(layer => {
                layer.forEach(blk => {
                    const w = blk.weights || {};
                    Object.values(w).forEach(arr => {
                        if (Array.isArray(arr)) paramCount += arr.length;
                    });
                });
            });
        }
        const hasOpt = !!(parsed.optimizer && parsed.optimizer.mList && parsed.optimizer.mList.length > 0);
        const binaryVramMb = ((paramCount * 3 * 4) / (1024 * 1024)).toFixed(2);
        const jsonKb = (rawLength / 1024).toFixed(1);
        const numGlobals = m.globals ? Object.keys(m.globals).length : 9;
        const expectedTensors = numGlobals + 1 + (numLayers * 13) + 4 + ((numGlobals + numLayers * 10) * 2 + 2);
        return {
            tier: parsed.tier || 1,
            step: parsed.step || 0,
            numLayers,
            activeN,
            paramCount,
            hasOpt,
            binaryVramMb,
            jsonKb,
            expectedTensors,
            type: m.type || 'Legacy O-Former'
        };
    } catch (e) {
        return null;
    }
};

Object.assign(window.CORAL, {
    serializeOptimizerState,
    restoreOptimizerState,
    inspectDnaObject
});
})();
