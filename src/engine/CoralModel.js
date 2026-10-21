// C.O.R.A.L. Organic Transformer Cortex (Universal Recurrence, Dual Readout, & Multi-Task Latents)
window.CORAL = window.CORAL || {};

class CoralModel {
    constructor(config, savedState = null) {
        this.config = { ...config }; 
        this.config.maxBlocks = config.maxBlocks || 3; 
        this.config.maxHeads = config.maxHeads || 4; 
        this.config.dModel = config.dModel || 64; 
        this.config.gridSize = config.gridSize || 4; 
        this.config.size = config.size || 256;
        this.config.ponderSteps = config.ponderSteps || 1;
        this.config.readoutMode = config.readoutMode || 'scalar';
        this.config.activeVocab = config.activeVocab || 4;
        this.config.manifoldMode = config.manifoldMode || '2d';
        this.seqLen = this.config.gridSize * this.config.gridSize;
        this.isDisposed = false;
        this.layers = [];
        this.vocabAnchorsTensor = tf.tensor2d(window.CORAL.VOCAB_ANCHOR_VALUES, [window.CORAL.MAX_VOCAB, 1]);
        this.symAnchorRow = tf.tensor2d([0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], [1, 10]);

        if (!savedState) {
            tf.tidy(() => {
                this.inputProj = tf.variable(tf.randomNormal([1, this.config.dModel], 0, 0.02));
                this.inputBias = tf.variable(tf.zeros([this.config.dModel]));
                this.symbolEmbeddings = tf.variable(tf.randomNormal([10, this.config.dModel], 0, 0.02));
                this.taskEmbeddings = tf.variable(tf.randomNormal([window.CORAL.NUM_TASKS, this.config.dModel], 0, 0.05));
                
                const p0 = tf.zeros([1, this.config.dModel]);
                const pRest = tf.randomNormal([window.CORAL.MAX_PONDER_STEPS - 1, this.config.dModel], 0, 0.01);
                this.ponderEmbeddings = tf.variable(tf.concat([p0, pRest], 0));

                this.outputHead = tf.variable(tf.randomNormal([this.config.dModel, 1], 0, 0.02));
                this.outputBias = tf.variable(tf.zeros([1]));

                this.vocabHead = tf.variable(tf.randomNormal([this.config.dModel, window.CORAL.MAX_VOCAB], 0, 0.02));
                const initVBias = new Array(window.CORAL.MAX_VOCAB).fill(-6.0);
                for (let i = 0; i < this.config.activeVocab; i++) initVBias[i] = 0.0;
                this.vocabBias = tf.variable(tf.tensor1d(initVBias));
            });
            this.addBlock(0);
        } else {
            this.inputProj = null;
            this.inputBias = null;
            this.symbolEmbeddings = null;
            this.taskEmbeddings = null;
            this.ponderEmbeddings = null;
            this.outputHead = null;
            this.outputBias = null;
            this.vocabHead = null;
            this.vocabBias = null;
        }
    }

    addBlock(layerIndex) {
        if (this.isDisposed) return;
        if (!this.layers[layerIndex]) this.layers[layerIndex] = [];
        const block = new window.CORAL.OrganicBlock(this.config.dModel, this.config.maxHeads, this.config.size, this.config.gridSize, false, this.config.manifoldMode || '2d');
        this.layers[layerIndex].push(block);
    }

    setManifoldMode(mode = '2d') {
        if (this.isDisposed) return;
        const target = mode === '1d' ? '1d' : '2d';
        this.config.manifoldMode = target;
        for (let l = 0; l < this.layers.length; l++) {
            for (let b = 0; b < this.layers[l].length; b++) {
                this.layers[l][b].setManifoldMode(target);
            }
        }
    }

    getOrderedVariables(layout = 'v15.3') {
        let vars;
        if (layout === 'v14.9') {
            vars = [
                this.inputProj, 
                this.inputBias, 
                this.taskEmbeddings, 
                this.outputHead, 
                this.outputBias
            ];
        } else if (layout === 'v15.0') {
            vars = [
                this.inputProj, 
                this.inputBias, 
                this.taskEmbeddings, 
                this.ponderEmbeddings, 
                this.outputHead, 
                this.outputBias
            ];
        } else if (layout === 'v15.1' || layout === 'v15.2') {
            vars = [
                this.inputProj, 
                this.inputBias, 
                this.taskEmbeddings, 
                this.ponderEmbeddings, 
                this.outputHead, 
                this.outputBias,
                this.vocabHead,
                this.vocabBias
            ];
        } else {
            vars = [
                this.inputProj, 
                this.inputBias, 
                this.symbolEmbeddings,
                this.taskEmbeddings, 
                this.ponderEmbeddings, 
                this.outputHead, 
                this.outputBias,
                this.vocabHead,
                this.vocabBias
            ];
        }
        for (let l = 0; l < this.layers.length; l++) {
            for (let b = 0; b < this.layers[l].length; b++) {
                const blk = this.layers[l][b];
                vars.push(
                    blk.wQ, blk.wK, blk.wV, blk.wO,
                    blk.wUp, blk.bUp, blk.wDown, blk.bDown,
                    blk.gamma1, blk.gamma2
                );
            }
        }
        return vars.filter(v => v && !v.isDisposed);
    }

    getTotalParameters() {
        let total = (3 + 10 + window.CORAL.NUM_TASKS + window.CORAL.MAX_PONDER_STEPS + window.CORAL.MAX_VOCAB) * this.config.dModel + 1 + window.CORAL.MAX_VOCAB;
        for (let layer of this.layers) {
            for (let block of layer) {
                total += block.getParamCount();
            }
        }
        return total;
    }

    async serialize() {
        const gd = async (t) => (t && !t.isDisposed) ? Array.from(await t.data()) : [];
        const globals = { 
            inputProj: await gd(this.inputProj), 
            inputBias: await gd(this.inputBias), 
            symbolEmbeddings: await gd(this.symbolEmbeddings),
            taskEmbeddings: await gd(this.taskEmbeddings),
            ponderEmbeddings: await gd(this.ponderEmbeddings),
            outputHead: await gd(this.outputHead), 
            outputBias: await gd(this.outputBias),
            vocabHead: await gd(this.vocabHead),
            vocabBias: await gd(this.vocabBias)
        };
        const topology = [];
        for (let i = 0; i < this.layers.length; i++) {
            const layerBlocks = [];
            for (let j = 0; j < this.layers[i].length; j++) {
                layerBlocks.push(await this.layers[i][j].serialize());
            }
            topology.push(layerBlocks);
        }
        return { 
            config: this.config, 
            activeNeurons: this.getTotalActiveNeurons(), 
            totalParameters: this.getTotalParameters(),
            globals: globals, 
            topology: topology, 
            type: 'O-Former-v15.3' 
        };
    }

    hydrate(data) {
        const g = data.globals || {};
        const firstBlock = (data.topology && data.topology[0] && data.topology[0][0]) ? data.topology[0][0] : {};
        const cfg = data.config || {};

        const inferredDModel = (g.inputProj && g.inputProj.length) ? g.inputProj.length : (cfg.dModel || firstBlock.dModel || 64);
        const inferredMaxFF = (firstBlock.weights && firstBlock.weights.bUp) ? firstBlock.weights.bUp.length : (cfg.size || firstBlock.maxFF || 256);
        const inferredHeads = cfg.maxHeads || firstBlock.maxHeads || (firstBlock.masks && firstBlock.masks.head ? firstBlock.masks.head.length : 4);
        const inferredGrid = cfg.gridSize || firstBlock.gridSize || 4;
        const inferredBlocks = Math.max(cfg.maxBlocks || 3, (data.topology ? data.topology.length : 1));
        const inferredPonder = cfg.ponderSteps || 1;
        const inferredReadout = cfg.readoutMode || 'scalar';
        const inferredVocab = Math.max(2, Math.min(window.CORAL.MAX_VOCAB, cfg.activeVocab || 4));
        const inferredManifold = cfg.manifoldMode || '2d';

        this.config = {
            ...this.config,
            dModel: inferredDModel,
            size: inferredMaxFF,
            maxHeads: inferredHeads,
            gridSize: inferredGrid,
            maxBlocks: inferredBlocks,
            ponderSteps: inferredPonder,
            readoutMode: inferredReadout,
            activeVocab: inferredVocab,
            manifoldMode: inferredManifold,
            inputDim: inferredGrid * inferredGrid,
            outputDim: inferredGrid * inferredGrid
        };
        this.seqLen = this.config.gridSize * this.config.gridSize;

        const restore = (curr, val, shape, fallbackStd = 0.02) => { 
            if (curr && !curr.isDisposed) curr.dispose(); 
            return tf.tidy(() => {
                if (!val || val.length !== shape.reduce((a, b) => a * b, 1)) {
                    return tf.variable(tf.randomNormal(shape, 0, fallbackStd));
                }
                return tf.variable(tf.tensor(val, shape)); 
            });
        };

        this.inputProj = restore(this.inputProj, g.inputProj, [1, this.config.dModel]);
        this.inputBias = restore(this.inputBias, g.inputBias, [this.config.dModel]);
        this.symbolEmbeddings = restore(this.symbolEmbeddings, g.symbolEmbeddings, [10, this.config.dModel], 0.02);

        if (this.taskEmbeddings && !this.taskEmbeddings.isDisposed) this.taskEmbeddings.dispose();
        if (g.taskEmbeddings && g.taskEmbeddings.length === 20 * this.config.dModel && window.CORAL.NUM_TASKS === 21) {
            this.taskEmbeddings = tf.tidy(() => {
                const t20 = tf.tensor(g.taskEmbeddings, [20, this.config.dModel]);
                const tExtra = tf.randomNormal([1, this.config.dModel], 0, 0.05);
                return tf.variable(tf.concat([t20, tExtra], 0));
            });
        } else {
            this.taskEmbeddings = restore(null, g.taskEmbeddings, [window.CORAL.NUM_TASKS, this.config.dModel], 0.05);
        }

        if (this.ponderEmbeddings && !this.ponderEmbeddings.isDisposed) this.ponderEmbeddings.dispose();
        if (g.ponderEmbeddings && g.ponderEmbeddings.length === window.CORAL.MAX_PONDER_STEPS * this.config.dModel) {
            this.ponderEmbeddings = tf.tidy(() => tf.variable(tf.tensor(g.ponderEmbeddings, [window.CORAL.MAX_PONDER_STEPS, this.config.dModel])));
        } else {
            this.ponderEmbeddings = tf.tidy(() => {
                const p0 = tf.zeros([1, this.config.dModel]);
                const pRest = tf.randomNormal([window.CORAL.MAX_PONDER_STEPS - 1, this.config.dModel], 0, 0.01);
                return tf.variable(tf.concat([p0, pRest], 0));
            });
        }

        this.outputHead = restore(this.outputHead, g.outputHead, [this.config.dModel, 1]);
        this.outputBias = restore(this.outputBias, g.outputBias, [1]);

        this.vocabHead = restore(this.vocabHead, g.vocabHead, [this.config.dModel, window.CORAL.MAX_VOCAB], 0.02);
        if (this.vocabBias && !this.vocabBias.isDisposed) this.vocabBias.dispose();
        if (g.vocabBias && g.vocabBias.length === window.CORAL.MAX_VOCAB) {
            this.vocabBias = tf.tidy(() => tf.variable(tf.tensor1d(g.vocabBias)));
        } else {
            this.vocabBias = tf.tidy(() => {
                const initVBias = new Array(window.CORAL.MAX_VOCAB).fill(-6.0);
                for (let i = 0; i < this.config.activeVocab; i++) initVBias[i] = 0.0;
                return tf.variable(tf.tensor1d(initVBias));
            });
        }

        this.layers.flat().forEach(b => b.dispose());
        this.layers = [];
        (data.topology || []).forEach((layerData, lIdx) => {
            this.layers[lIdx] = [];
            layerData.forEach(blockData => {
                const block = new window.CORAL.OrganicBlock(this.config.dModel, this.config.maxHeads, this.config.size, this.config.gridSize, true, this.config.manifoldMode);
                block.hydrate(blockData);
                this.layers[lIdx].push(block);
            });
        });
    }

    getTaskToken(tierId = 1, blendConfig = null) {
        const idx1 = Math.max(0, Math.min(window.CORAL.NUM_TASKS - 1, (tierId || 1) - 1));
        const t1 = this.taskEmbeddings.slice([idx1, 0], [1, this.config.dModel]);
        if (blendConfig && blendConfig.enabled && blendConfig.secondaryTier && blendConfig.alpha > 0) {
            const idx2 = Math.max(0, Math.min(window.CORAL.NUM_TASKS - 1, blendConfig.secondaryTier - 1));
            const t2 = this.taskEmbeddings.slice([idx2, 0], [1, this.config.dModel]);
            const a = blendConfig.alpha;
            return t1.mul(1.0 - a).add(t2.mul(a)).reshape([1, 1, this.config.dModel]);
        }
        return t1.reshape([1, 1, this.config.dModel]);
    }

    encodeStem(x, tierId = 1, blendConfig = null) {
        const batch = x.shape[0];
        const xFlat = x.reshape([batch * this.seqLen, 1]);
        let hSpatial = xFlat.matMul(this.inputProj).add(this.inputBias);
        
        const symDiffSq = xFlat.sub(this.symAnchorRow).square().mul(-1000.0);
        const symWeights = tf.softmax(symDiffSq);
        const symVecs = symWeights.matMul(this.symbolEmbeddings);
        hSpatial = hSpatial.add(symVecs);

        hSpatial = hSpatial.reshape([batch, this.seqLen, this.config.dModel]);
        const taskTok = this.getTaskToken(tierId, blendConfig).tile([batch, 1, 1]);
        return tf.concat([taskTok, hSpatial], 1);
    }

    runSinglePonderPass(hIn, k, K) {
        const stepWeight = 1.0 / K;
        let hStep = hIn;
        if (k > 0) {
            const pStep = this.ponderEmbeddings.slice([k, 0], [1, this.config.dModel]).reshape([1, 1, this.config.dModel]);
            hStep = hIn.add(pStep);
        }

        for (let l = 0; l < this.layers.length; l++) {
            const blocks = this.layers[l];
            if (blocks.length === 1) {
                hStep = blocks[0].forward(hStep);
            } else {
                let accum = null;
                for (let b = 0; b < blocks.length; b++) {
                    const res = blocks[b].forward(hStep);
                    accum = accum ? accum.add(res) : res;
                }
                hStep = accum.div(blocks.length);
            }
        }

        if (K === 1) return hStep;
        return hIn.mul(1.0 - stepWeight).add(hStep.mul(stepWeight));
    }

    decodeHead(h, batch) {
        const hSpatialOut = h.slice([0, 1, 0], [batch, this.seqLen, this.config.dModel]);
        const hOut = hSpatialOut.reshape([batch * this.seqLen, this.config.dModel]);

        if (this.config.readoutMode === 'vocab') {
            const V = Math.max(2, Math.min(window.CORAL.MAX_VOCAB, this.config.activeVocab || 4));
            const isFullV = (V === window.CORAL.MAX_VOCAB);
            const curW = isFullV ? this.vocabHead : this.vocabHead.slice([0, 0], [this.config.dModel, V]);
            const curB = isFullV ? this.vocabBias : this.vocabBias.slice([0], [V]);
            const curAnchors = isFullV ? this.vocabAnchorsTensor : this.vocabAnchorsTensor.slice([0, 0], [V, 1]);

            const logits = hOut.matMul(curW).add(curB);
            const probs = tf.softmax(logits);
            const expectedFlat = probs.matMul(curAnchors);
            return expectedFlat.reshape([batch, this.seqLen]);
        }

        const outFlat = hOut.matMul(this.outputHead).add(this.outputBias);
        return outFlat.reshape([batch, this.seqLen]);
    }

    computeVocabTargets(yTrue) {
        const batch = yTrue.shape[0];
        const V = Math.max(2, Math.min(window.CORAL.MAX_VOCAB, this.config.activeVocab || 4));
        const isFullV = (V === window.CORAL.MAX_VOCAB);
        return tf.tidy(() => {
            const curAnchors = isFullV ? this.vocabAnchorsTensor : this.vocabAnchorsTensor.slice([0, 0], [V, 1]);
            const yFlat = yTrue.reshape([batch * this.seqLen, 1]);
            const anchorsRow = curAnchors.transpose(); // [1, V] float32
            const negDistSq = yFlat.sub(anchorsRow).square().mul(-1000.0); // [batch * seqLen, V] float32
            return tf.softmax(negDistSq);
        });
    }

    computeTrainLoss(x, yTrue, hPrefix, targetOneHot = null, tierId = 1, blendConfig = null, customPonderSteps = null, regStrength = 0.0001) {
        const batch = x.shape[0];
        const K = Math.max(1, Math.min(window.CORAL.MAX_PONDER_STEPS, customPonderSteps || this.config.ponderSteps || 1));
        const regLoss = this.getRegularizationLoss(regStrength);

        const h0 = this.encodeStem(x, tierId, blendConfig);
        let hFinal;
        if (K === 1 || !hPrefix) {
            hFinal = this.runSinglePonderPass(h0, 0, 1);
        } else {
            const hIn = hPrefix.mul(0.85).add(h0.mul(0.15));
            hFinal = this.runSinglePonderPass(hIn, K - 1, K);
        }

        const hSpatialOut = hFinal.slice([0, 1, 0], [batch, this.seqLen, this.config.dModel]);
        const hOut = hSpatialOut.reshape([batch * this.seqLen, this.config.dModel]);

        if (this.config.readoutMode === 'vocab') {
            const V = Math.max(2, Math.min(window.CORAL.MAX_VOCAB, this.config.activeVocab || 4));
            const isFullV = (V === window.CORAL.MAX_VOCAB);
            const curW = isFullV ? this.vocabHead : this.vocabHead.slice([0, 0], [this.config.dModel, V]);
            const curB = isFullV ? this.vocabBias : this.vocabBias.slice([0], [V]);
            const curAnchors = isFullV ? this.vocabAnchorsTensor : this.vocabAnchorsTensor.slice([0, 0], [V, 1]);

            const logits = hOut.matMul(curW).add(curB); // [batch * seqLen, V]
            const probs = tf.softmax(logits);
            const expectedFlat = probs.matMul(curAnchors);
            const expectedPred = expectedFlat.reshape([batch, this.seqLen]);

            const mseLoss = tf.losses.meanSquaredError(yTrue, expectedPred);
            if (targetOneHot) {
                const probLoss = probs.sub(targetOneHot).square().mean();
                return mseLoss.mul(0.5).add(probLoss.mul(0.5)).add(regLoss);
            }
            return mseLoss.add(regLoss);
        }

        const outFlat = hOut.matMul(this.outputHead).add(this.outputBias);
        const pred = outFlat.reshape([batch, this.seqLen]);
        const mse = tf.losses.meanSquaredError(yTrue, pred);
        return mse.add(regLoss);
    }

    async growVocab(amount = 2) {
        if (this.isDisposed || !this.vocabHead || this.vocabHead.isDisposed || !this.vocabBias || this.vocabBias.isDisposed) return false;
        const oldV = Math.max(2, Math.min(window.CORAL.MAX_VOCAB, this.config.activeVocab || 4));
        if (oldV >= window.CORAL.MAX_VOCAB) return false;
        const newV = Math.min(window.CORAL.MAX_VOCAB, oldV + amount);

        const [wData, bData] = await Promise.all([
            this.vocabHead.data(),
            this.vocabBias.data()
        ]);
        if (this.isDisposed || this.vocabHead.isDisposed || this.vocabBias.isDisposed) return false;

        const wArr = Array.from(wData);
        const bArr = Array.from(bData);

        for (let c = oldV; c < newV; c++) {
            bArr[c] = -6.0;
            for (let r = 0; r < this.config.dModel; r++) {
                wArr[r * window.CORAL.MAX_VOCAB + c] = 0.0;
            }
        }

        tf.tidy(() => {
            if (!this.vocabHead.isDisposed && !this.vocabBias.isDisposed) {
                this.vocabHead.assign(tf.tensor2d(wArr, [this.config.dModel, window.CORAL.MAX_VOCAB]));
                this.vocabBias.assign(tf.tensor1d(bArr));
            }
        });

        this.config.activeVocab = newV;
        return true;
    }

    computePonderPrefix(x, tierId = 1, blendConfig = null, K = 1) {
        let h = tf.tidy(() => this.encodeStem(x, tierId, blendConfig));
        for (let k = 0; k < K - 1; k++) {
            const prevH = h;
            h = tf.tidy(() => this.runSinglePonderPass(prevH, k, K));
            prevH.dispose();
        }
        return h;
    }

    trainForward(x, hPrefix, tierId = 1, blendConfig = null, customPonderSteps = null) {
        const batch = x.shape[0];
        const K = Math.max(1, Math.min(window.CORAL.MAX_PONDER_STEPS, customPonderSteps || this.config.ponderSteps || 1));
        const h0 = this.encodeStem(x, tierId, blendConfig);

        if (K === 1 || !hPrefix) {
            const hFinal = this.runSinglePonderPass(h0, 0, 1);
            return this.decodeHead(hFinal, batch);
        }

        const hIn = hPrefix.mul(0.85).add(h0.mul(0.15));
        const hFinal = this.runSinglePonderPass(hIn, K - 1, K);
        return this.decodeHead(hFinal, batch);
    }

    predict(x, tierId = 1, blendConfig = null, customPonderSteps = null) {
        const batch = x.shape[0];
        const K = Math.max(1, Math.min(window.CORAL.MAX_PONDER_STEPS, customPonderSteps || this.config.ponderSteps || 1));
        let h = this.encodeStem(x, tierId, blendConfig);

        for (let k = 0; k < K; k++) {
            h = this.runSinglePonderPass(h, k, K);
        }

        return this.decodeHead(h, batch);
    }

    predictInference(x, tierId = 1, blendConfig = null, customPonderSteps = null) {
        return tf.tidy(() => {
            const batch = x.shape[0];
            const K = Math.max(1, Math.min(window.CORAL.MAX_PONDER_STEPS, customPonderSteps || this.config.ponderSteps || 1));
            let h = tf.tidy(() => this.encodeStem(x, tierId, blendConfig));
            for (let k = 0; k < K; k++) {
                const prevH = h;
                h = tf.tidy(() => this.runSinglePonderPass(prevH, k, K));
                prevH.dispose();
            }
            const out = this.decodeHead(h, batch);
            h.dispose();
            return out;
        });
    }

    getRegularizationLoss(decay) {
        const headReg = this.config.readoutMode === 'vocab'
            ? this.vocabHead.square().mean().add(this.outputHead.square().mean().mul(0.01)).add(this.vocabBias.square().mean().mul(0.001)).add(this.outputBias.square().mean().mul(0.001))
            : this.outputHead.square().mean().add(this.vocabHead.square().mean().mul(0.01)).add(this.vocabBias.square().mean().mul(0.001)).add(this.outputBias.square().mean().mul(0.001));
        let loss = this.inputProj.square().mean()
            .add(this.inputBias.square().mean().mul(0.001))
            .add(headReg)
            .add(this.symbolEmbeddings.square().mean().mul(0.05))
            .add(this.taskEmbeddings.square().mean().mul(0.1))
            .add(this.ponderEmbeddings.square().mean().mul(0.05));
        for(let l=0; l<this.layers.length; l++) {
            for(let b=0; b<this.layers[l].length; b++) {
                loss = loss.add(this.layers[l][b].getWeightCost());
            }
        }
        return loss.mul(decay);
    }

    getTotalActiveNeurons() { 
        let total = 0; 
        for(let layer of this.layers) for(let block of layer) total += block.getActiveNeuronCount(); 
        return total; 
    }

    getTotalConsolidatedNeurons() {
        let total = 0;
        for(let layer of this.layers) for(let block of layer) total += block.getConsolidatedCount();
        return total;
    }

    getMaxPossibleNeurons() {
        return Math.max(1, this.layers.length) * this.config.size;
    }

    async consolidateMasteredTask() {
        if (this.isDisposed) return;
        for(let layer of this.layers) {
            for(let block of layer) {
                if (this.isDisposed || block.isDisposed) return;
                await block.consolidateSynapses(0.20);
            }
        }
    }

    async getVizData(probeInput, tierId = 1, blendConfig = null, activeVizIdx = 0) {
        if (this.isDisposed || !this.inputProj || this.inputProj.isDisposed || !probeInput || probeInput.isDisposed) return null;

        for (let l = 0; l < this.layers.length; l++) {
            for (let b = 0; b < this.layers[l].length; b++) {
                const blk = this.layers[l][b];
                if (!blk || blk.isDisposed || !blk.wUp || blk.wUp.isDisposed) return null;
            }
        }

        const K = Math.max(1, Math.min(window.CORAL.MAX_PONDER_STEPS, this.config.ponderSteps || 1));
        const V = Math.max(2, Math.min(window.CORAL.MAX_VOCAB, this.config.activeVocab || 4));
        const isVocabMode = (this.config.readoutMode === 'vocab');
        const stepWeight = 1.0 / K;
        const totalSeq = this.seqLen + 1;
        const resRowLen = totalSeq * this.config.dModel;

        const blockMeta = [];
        const residualMeta = [];
        const attnMeta = [];
        let trackedTensors = [];

        try {
            let totalBlocks = 0;
            for (let l = 0; l < this.layers.length; l++) {
                totalBlocks += this.layers[l].length;
            }
            const totalAttnSlots = Math.max(1, K * totalBlocks);
            const targetAttnIdx = Math.max(0, Math.min(totalAttnSlots - 1, activeVizIdx || 0));

            const graphOutputs = tf.tidy(() => {
                const resTensors = [];
                let selectedSpAttn = null;
                let selectedTkAttn = null;

                const xFlat = probeInput.reshape([this.seqLen, 1]);
                const symDiffSq = xFlat.sub(this.symAnchorRow).square().mul(-1000.0);
                const symWeights = tf.softmax(symDiffSq);
                const symVecs = symWeights.matMul(this.symbolEmbeddings);
                let hSpatial = xFlat.matMul(this.inputProj).add(this.inputBias).add(symVecs);
                hSpatial = hSpatial.reshape([1, this.seqLen, this.config.dModel]);
                const taskTok = this.getTaskToken(tierId, blendConfig);
                let h = tf.concat([taskTok, hSpatial], 1);

                resTensors.push(h);
                residualMeta.push('Stem+[TASK]');

                let runningAttnIdx = 0;

                for (let k = 0; k < K; k++) {
                    let hStep = h;
                    if (k > 0) {
                        const pStep = this.ponderEmbeddings.slice([k, 0], [1, this.config.dModel]).reshape([1, 1, this.config.dModel]);
                        hStep = h.add(pStep);
                    }

                    for (let l = 0; l < this.layers.length; l++) {
                        const blocks = this.layers[l];
                        for (let b = 0; b < blocks.length; b++) {
                            const block = blocks[b];
                            const suffix = blocks.length > 1 ? `-${String.fromCharCode(65 + b)}` : '';
                            const baseLabel = `L${l + 1}${suffix}`;

                            if (k === 0) {
                                blockMeta.push({
                                    blockRef: block,
                                    m: [...block.ffnMaskState],
                                    c: [...block.consolidatedNeurons],
                                    label: baseLabel,
                                    activeFF: block.activeFF,
                                    activeHeads: block.activeHeads,
                                    consolidated: block.getConsolidatedCount()
                                });
                            }

                            if (runningAttnIdx === targetAttnIdx) {
                                const attnTensor = block.getAttention(hStep);
                                selectedSpAttn = attnTensor.slice([0, 1, 1], [block.activeHeads, this.seqLen, this.seqLen]);
                                selectedTkAttn = attnTensor.slice([0, 1, 0], [block.activeHeads, this.seqLen, 1]).squeeze([2]);
                            }

                            attnMeta.push({
                                mask: [...block.headMaskState],
                                label: K > 1 ? `P${k + 1} • ${baseLabel}` : baseLabel,
                                activeHeads: block.activeHeads,
                                maxHeads: this.config.maxHeads,
                                seqLen: this.seqLen,
                                totalSeq: totalSeq
                            });
                            runningAttnIdx++;
                        }

                        if (blocks.length === 1) {
                            hStep = blocks[0].forward(hStep);
                        } else {
                            let accum = null;
                            for (let b = 0; b < blocks.length; b++) {
                                const res = blocks[b].forward(hStep);
                                accum = accum ? accum.add(res) : res;
                            }
                            hStep = accum.div(blocks.length);
                        }

                        resTensors.push(hStep);
                        residualMeta.push(K > 1 ? `P${k + 1} • L${l + 1}` : `L${l + 1}`);
                    }

                    if (K === 1) {
                        h = hStep;
                    } else {
                        h = h.mul(1.0 - stepWeight).add(hStep.mul(stepWeight));
                    }
                }

                const allResidualsTensor = tf.concat(resTensors, 0);

                const hSpatialOut = h.slice([0, 1, 0], [1, this.seqLen, this.config.dModel]);
                const hOut = hSpatialOut.reshape([this.seqLen, this.config.dModel]);
                let predTensor = null;
                let vocabProbsTensor = null;

                if (isVocabMode) {
                    const isFullV = (V === window.CORAL.MAX_VOCAB);
                    const curW = isFullV ? this.vocabHead : this.vocabHead.slice([0, 0], [this.config.dModel, V]);
                    const curB = isFullV ? this.vocabBias : this.vocabBias.slice([0], [V]);
                    const curAnchors = isFullV ? this.vocabAnchorsTensor : this.vocabAnchorsTensor.slice([0, 0], [V, 1]);
                    const logits = hOut.matMul(curW).add(curB);
                    vocabProbsTensor = tf.softmax(logits);
                    predTensor = vocabProbsTensor.matMul(curAnchors);
                } else {
                    predTensor = hOut.matMul(this.outputHead).add(this.outputBias);
                }

                return { allResidualsTensor, selectedSpAttn, selectedTkAttn, predTensor, vocabProbsTensor };
            });

            trackedTensors = [
                graphOutputs.allResidualsTensor,
                graphOutputs.selectedSpAttn,
                graphOutputs.selectedTkAttn,
                graphOutputs.predTensor,
                graphOutputs.vocabProbsTensor
            ].filter(Boolean);

            const [wBuffers, allResFlatBuffer, spAttnBuffer, tkAttnBuffer, predBuffer, vocabProbsBuffer] = await Promise.all([
                Promise.all(blockMeta.map(m => m.blockRef.wUp.data())),
                graphOutputs.allResidualsTensor.data(),
                graphOutputs.selectedSpAttn ? graphOutputs.selectedSpAttn.data() : Promise.resolve(null),
                graphOutputs.selectedTkAttn ? graphOutputs.selectedTkAttn.data() : Promise.resolve(null),
                graphOutputs.predTensor.data(),
                graphOutputs.vocabProbsTensor ? graphOutputs.vocabProbsTensor.data() : Promise.resolve(null)
            ]);

            if (this.isDisposed) return null;

            const blockData = blockMeta.map((m, idx) => ({
                w: wBuffers[idx],
                m: m.m,
                c: m.c,
                label: m.label,
                activeFF: m.activeFF,
                activeHeads: m.activeHeads,
                consolidated: m.consolidated
            }));

            const residualData = residualMeta.map((name, idx) => ({
                name,
                data: allResFlatBuffer.subarray(idx * resRowLen, (idx + 1) * resRowLen)
            }));

            const attentionData = attnMeta.map((m, idx) => ({
                data: idx === targetAttnIdx ? spAttnBuffer : null,
                taskRouting: idx === targetAttnIdx ? tkAttnBuffer : null,
                mask: m.mask,
                label: m.label,
                activeHeads: m.activeHeads,
                maxHeads: m.maxHeads,
                seqLen: m.seqLen,
                totalSeq: m.totalSeq
            }));

            return {
                blocks: blockData,
                attention: attentionData,
                residuals: residualData,
                prediction: predBuffer,
                vocabProbs: vocabProbsBuffer,
                activeVocab: V,
                readoutMode: this.config.readoutMode,
                rows: this.config.dModel,
                cols: this.config.size,
                gridSize: this.config.gridSize
            };
        } catch (err) {
            return null;
        } finally {
            tf.dispose(trackedTensors);
        }
    }

    async grow(amount = 8, headRatio = 24) {
        if (this.isDisposed) return false;
        let targetBlock = null;
        for(let l=0; l<this.layers.length; l++) { 
            for(let b of this.layers[l]) { 
                if (b.activeFF < b.maxFF || b.activeHeads < b.maxHeads) { 
                    targetBlock = b; 
                    break; 
                } 
            } 
            if(targetBlock) break; 
        }
        if (targetBlock) {
            const ratio = targetBlock.activeFF / Math.max(1, targetBlock.activeHeads * headRatio);
            if (targetBlock.activeHeads < targetBlock.maxHeads && ratio > 1.0) return await targetBlock.growHead();
            if (targetBlock.activeFF < targetBlock.maxFF) return await targetBlock.growFFN(amount);
            if (targetBlock.activeHeads < targetBlock.maxHeads) return await targetBlock.growHead();
        }
        if (this.layers.length < this.config.maxBlocks) { 
            this.addBlock(this.layers.length); 
            return true; 
        }
        return false;
    }

    async prune(baseRate = 0.1) {
        if (this.isDisposed) return 0;
        let prunedTotal = 0; const totalLayers = this.layers.length;
        for(let l=0; l<totalLayers; l++) { 
            const blocks = this.layers[l]; 
            const stabilityFactor = 0.5 + (0.5 * (l / Math.max(1, totalLayers - 1))); 
            const effectiveRate = baseRate * stabilityFactor; 
            for(let block of blocks) {
                if (this.isDisposed || block.isDisposed) return prunedTotal;
                prunedTotal += await block.prune(effectiveRate); 
            }
        }
        return prunedTotal;
    }

    dispose() {
        this.isDisposed = true;
        tf.dispose([
            this.inputProj, 
            this.inputBias, 
            this.symbolEmbeddings,
            this.taskEmbeddings, 
            this.ponderEmbeddings, 
            this.outputHead, 
            this.outputBias,
            this.vocabHead,
            this.vocabBias,
            this.vocabAnchorsTensor,
            this.symAnchorRow
        ]);
        this.layers.flat().forEach(b => b.dispose());
    }
}

window.CORAL.CoralModel = CoralModel;
