// C.O.R.A.L. Organic Transformer Block (Zero-Shock Neurogenesis & Myelinated Consolidation)
window.CORAL = window.CORAL || {};

class OrganicBlock {
    constructor(dModel, maxHeads, maxFF, gridSize, skipInit = false, manifoldMode = '2d') {
        this.dModel = dModel;
        this.maxHeads = maxHeads;
        this.maxFF = maxFF;
        this.gridSize = gridSize;
        this.manifoldMode = manifoldMode || '2d';
        this.seqLen = gridSize * gridSize;
        this.headDim = Math.max(1, Math.floor(dModel / maxHeads));
        this.attnDim = this.maxHeads * this.headDim;
        this.isDisposed = false;

        const hm = new Array(maxHeads).fill(0);
        hm[0] = 1; 
        this.headMaskState = hm; 
        this.activeHeads = 1;

        const fm = new Array(maxFF).fill(0);
        for(let i=0; i<8; i++) fm[i] = 1; 
        this.ffnMaskState = fm;
        this.activeFF = 8;

        this.consolidatedNeurons = new Array(maxFF).fill(0);

        if (!skipInit) {
            tf.tidy(() => {
                this.wQ = tf.variable(tf.randomNormal([dModel, this.attnDim], 0, 0.02));
                this.wK = tf.variable(tf.randomNormal([dModel, this.attnDim], 0, 0.02));
                this.wV = tf.variable(tf.randomNormal([dModel, this.attnDim], 0, 0.02));
                this.wO = tf.variable(tf.zeros([this.attnDim, dModel])); 

                this.wUp = tf.variable(tf.randomNormal([dModel, maxFF], 0, 0.02));
                this.bUp = tf.variable(tf.zeros([maxFF]));
                this.wDown = tf.variable(tf.zeros([maxFF, dModel]));
                this.bDown = tf.variable(tf.zeros([dModel]));

                this.gamma1 = tf.variable(tf.ones([dModel]));
                this.gamma2 = tf.variable(tf.ones([dModel]));
            });
            this.ropeCache = window.CORAL.get2DAxialRoPE(this.gridSize, this.headDim, this.manifoldMode);
            this.ffnMaskTensor = tf.tensor2d(this.ffnMaskState, [1, this.maxFF]);
        } else {
            this.wQ = null; this.wK = null; this.wV = null; this.wO = null;
            this.wUp = null; this.bUp = null; this.wDown = null; this.bDown = null;
            this.gamma1 = null; this.gamma2 = null;
            this.ropeCache = null;
            this.ffnMaskTensor = null;
        }
    }

    setManifoldMode(mode = '2d') {
        if (this.isDisposed) return;
        this.manifoldMode = mode === '1d' ? '1d' : '2d';
        if (this.ropeCache) {
            if (this.ropeCache.cos && !this.ropeCache.cos.isDisposed) this.ropeCache.cos.dispose();
            if (this.ropeCache.sin && !this.ropeCache.sin.isDisposed) this.ropeCache.sin.dispose();
        }
        this.ropeCache = window.CORAL.get2DAxialRoPE(this.gridSize, this.headDim, this.manifoldMode);
    }

    getParamCount() {
        return (4 * this.dModel * this.attnDim) + (2 * this.dModel * this.maxFF) + this.maxFF + (3 * this.dModel);
    }

    updateMaskTensors() {
        if (this.isDisposed) return;
        if (this.ffnMaskTensor && !this.ffnMaskTensor.isDisposed) {
            this.ffnMaskTensor.dispose();
        }
        this.ffnMaskTensor = tf.tensor2d(this.ffnMaskState, [1, this.maxFF]);
    }

    dispose() {
        this.isDisposed = true;
        tf.dispose([
            this.wQ, this.wK, this.wV, this.wO, 
            this.wUp, this.bUp, this.wDown, this.bDown, 
            this.gamma1, this.gamma2,
            this.ffnMaskTensor
        ]);
        if(this.ropeCache) {
            if (this.ropeCache.cos && !this.ropeCache.cos.isDisposed) this.ropeCache.cos.dispose();
            if (this.ropeCache.sin && !this.ropeCache.sin.isDisposed) this.ropeCache.sin.dispose();
        }
    }

    async serialize() {
        const gd = async (t) => (t && !t.isDisposed) ? Array.from(await t.data()) : [];
        return {
            dModel: this.dModel,
            maxHeads: this.maxHeads,
            maxFF: this.maxFF,
            gridSize: this.gridSize,
            masks: {
                head: [...this.headMaskState],
                ffn: [...this.ffnMaskState],
                consolidated: [...this.consolidatedNeurons],
                activeHeads: this.activeHeads,
                activeFF: this.activeFF
            },
            weights: {
                wQ: await gd(this.wQ),
                wK: await gd(this.wK),
                wV: await gd(this.wV),
                wO: await gd(this.wO),
                wUp: await gd(this.wUp),
                bUp: await gd(this.bUp),
                wDown: await gd(this.wDown),
                bDown: await gd(this.bDown),
                gamma1: await gd(this.gamma1),
                gamma2: await gd(this.gamma2)
            }
        };
    }

    hydrate(data) {
        const w = data.weights || {};
        if (w.gamma1 && w.gamma1.length) {
            this.dModel = w.gamma1.length;
        } else if (data.dModel) {
            this.dModel = data.dModel;
        }

        if (w.bUp && w.bUp.length) {
            this.maxFF = w.bUp.length;
        } else if (data.maxFF) {
            this.maxFF = data.maxFF;
        }

        this.maxHeads = data.maxHeads || (data.masks && data.masks.head ? data.masks.head.length : this.maxHeads);
        this.gridSize = data.gridSize || this.gridSize;
        this.headDim = Math.max(1, Math.floor(this.dModel / this.maxHeads));
        
        const savedAttnDim = (w.wQ && this.dModel > 0) ? Math.floor(w.wQ.length / this.dModel) : (this.maxHeads * this.headDim);
        this.attnDim = savedAttnDim;
        this.headDim = Math.max(1, Math.floor(this.attnDim / this.maxHeads));
        this.seqLen = this.gridSize * this.gridSize;

        this.headMaskState = [...data.masks.head];
        this.ffnMaskState = [...data.masks.ffn];
        this.consolidatedNeurons = data.masks.consolidated ? [...data.masks.consolidated] : new Array(this.maxFF).fill(0);
        this.activeHeads = Math.max(1, data.masks.activeHeads || this.headMaskState.reduce((a, b) => a + b, 0));
        this.activeFF = Math.max(1, data.masks.activeFF || this.ffnMaskState.reduce((a, b) => a + b, 0));

        const restore = (curr, val, shape) => {
            if (curr && !curr.isDisposed) curr.dispose();
            return tf.tidy(() => {
                if (!val || val.length !== shape.reduce((a, b) => a * b, 1)) return tf.variable(tf.zeros(shape));
                return tf.variable(tf.tensor(val, shape));
            });
        };
        
        this.wQ = restore(this.wQ, w.wQ, [this.dModel, this.attnDim]);
        this.wK = restore(this.wK, w.wK, [this.dModel, this.attnDim]);
        this.wV = restore(this.wV, w.wV, [this.dModel, this.attnDim]);
        this.wO = restore(this.wO, w.wO, [this.attnDim, this.dModel]);
        
        this.wUp = restore(this.wUp, w.wUp, [this.dModel, this.maxFF]);
        this.bUp = restore(this.bUp, w.bUp, [this.maxFF]);
        this.wDown = restore(this.wDown, w.wDown, [this.maxFF, this.dModel]);
        this.bDown = restore(this.bDown, w.bDown, [this.dModel]);

        this.gamma1 = restore(this.gamma1, w.gamma1, [this.dModel]);
        this.gamma2 = restore(this.gamma2, w.gamma2, [this.dModel]);
        
        if(this.ropeCache) { 
            if (this.ropeCache.cos && !this.ropeCache.cos.isDisposed) this.ropeCache.cos.dispose(); 
            if (this.ropeCache.sin && !this.ropeCache.sin.isDisposed) this.ropeCache.sin.dispose(); 
        }
        this.ropeCache = window.CORAL.get2DAxialRoPE(this.gridSize, this.headDim, this.manifoldMode);

        this.updateMaskTensors();
    }

    rmsNorm(x, gamma, eps = 1e-5) {
        const meanSquare = x.square().mean(-1, true);
        return x.div(meanSquare.add(eps).sqrt()).mul(gamma);
    }

    forward(x) {
        const batch = x.shape[0];
        const seq = x.shape[1];
        const xFlat = x.reshape([batch * seq, this.dModel]);

        const xNorm1 = this.rmsNorm(xFlat, this.gamma1);

        const activeAttnDim = this.activeHeads * this.headDim;
        const isFullHeads = (this.activeHeads === this.maxHeads);

        const curWQ = isFullHeads ? this.wQ : this.wQ.slice([0, 0], [-1, activeAttnDim]);
        const curWK = isFullHeads ? this.wK : this.wK.slice([0, 0], [-1, activeAttnDim]);
        const curWV = isFullHeads ? this.wV : this.wV.slice([0, 0], [-1, activeAttnDim]);
        const curWO = isFullHeads ? this.wO : this.wO.slice([0, 0], [activeAttnDim, -1]);

        const Q_all = xNorm1.matMul(curWQ);
        const K_all = xNorm1.matMul(curWK);
        const V_all = xNorm1.matMul(curWV);

        let Q = Q_all.reshape([batch, seq, this.activeHeads, this.headDim])
            .transpose([0, 2, 1, 3])
            .reshape([batch * this.activeHeads, seq, this.headDim]);

        let K = K_all.reshape([batch, seq, this.activeHeads, this.headDim])
            .transpose([0, 2, 1, 3])
            .reshape([batch * this.activeHeads, seq, this.headDim]);

        const V = V_all.reshape([batch, seq, this.activeHeads, this.headDim])
            .transpose([0, 2, 1, 3])
            .reshape([batch * this.activeHeads, seq, this.headDim]);

        const cosSlice = this.ropeCache.cos.shape[1] === seq 
            ? this.ropeCache.cos 
            : this.ropeCache.cos.slice([0, 1, 0], [1, seq, this.headDim]);
        const sinSlice = this.ropeCache.sin.shape[1] === seq 
            ? this.ropeCache.sin 
            : this.ropeCache.sin.slice([0, 1, 0], [1, seq, this.headDim]);

        const Q_rot = window.CORAL.applyRoPE(Q, this.headDim);
        const K_rot = window.CORAL.applyRoPE(K, this.headDim);
        
        Q = Q.mul(cosSlice).add(Q_rot.mul(sinSlice));
        K = K.mul(cosSlice).add(K_rot.mul(sinSlice));

        const Q_scaled = Q.mul(1.0 / Math.sqrt(this.headDim));
        const scores = Q_scaled.matMul(K.transpose([0, 2, 1]));
        const attn = tf.softmax(scores);
        
        const weightedV = attn.matMul(V);

        const attnOut = weightedV.reshape([batch, this.activeHeads, seq, this.headDim])
            .transpose([0, 2, 1, 3])
            .reshape([batch * seq, activeAttnDim]);

        const projected = attnOut.matMul(curWO);
        const x2 = xFlat.add(projected);

        const xNorm2 = this.rmsNorm(x2, this.gamma2);
        let hidden = xNorm2.matMul(this.wUp).add(this.bUp);
        hidden = hidden.mul(tf.sigmoid(hidden)); 
        hidden = hidden.mul(this.ffnMaskTensor); 
        
        const ffnOut = hidden.matMul(this.wDown).add(this.bDown);
        
        return x2.add(ffnOut).reshape([batch, seq, this.dModel]);
    }

    getAttention(x) { 
        return tf.tidy(() => {
            const batch = x.shape[0]; const seq = x.shape[1];
            const xFlat = x.reshape([batch*seq, this.dModel]);
            const xNorm = this.rmsNorm(xFlat, this.gamma1);

            const activeAttnDim = this.activeHeads * this.headDim;
            const isFullHeads = (this.activeHeads === this.maxHeads);
            const curWQ = isFullHeads ? this.wQ : this.wQ.slice([0, 0], [-1, activeAttnDim]);
            const curWK = isFullHeads ? this.wK : this.wK.slice([0, 0], [-1, activeAttnDim]);

            let Q = xNorm.matMul(curWQ).reshape([batch,seq,this.activeHeads,this.headDim]).transpose([0,2,1,3]).reshape([batch*this.activeHeads,seq,this.headDim]);
            let K = xNorm.matMul(curWK).reshape([batch,seq,this.activeHeads,this.headDim]).transpose([0,2,1,3]).reshape([batch*this.activeHeads,seq,this.headDim]);
            
            const cosSlice = this.ropeCache.cos.shape[1] === seq 
                ? this.ropeCache.cos 
                : this.ropeCache.cos.slice([0, 1, 0], [1, seq, this.headDim]);
            const sinSlice = this.ropeCache.sin.shape[1] === seq 
                ? this.ropeCache.sin 
                : this.ropeCache.sin.slice([0, 1, 0], [1, seq, this.headDim]);

            Q = Q.mul(cosSlice).add(window.CORAL.applyRoPE(Q, this.headDim).mul(sinSlice));
            K = K.mul(cosSlice).add(window.CORAL.applyRoPE(K, this.headDim).mul(sinSlice));

            const Q_scaled = Q.mul(1.0 / Math.sqrt(this.headDim));
            const scores = Q_scaled.matMul(K.transpose([0,2,1]));
            const attn = tf.softmax(scores);
            const attn3D = attn.reshape([batch, this.activeHeads, seq, seq]);
            return attn3D.slice([0,0,0,0], [1, this.activeHeads, seq, seq]).squeeze([0]);
        });
    }
    
    getWeightCost() { 
        return this.wQ.square().mean()
            .add(this.wK.square().mean())
            .add(this.wV.square().mean())
            .add(this.wO.square().mean())
            .add(this.wUp.square().mean())
            .add(this.wDown.square().mean()); 
    }
    
    getActiveNeuronCount() { return this.ffnMaskState.reduce((a, b) => a + b, 0); }
    getConsolidatedCount() { return this.consolidatedNeurons.reduce((a, b, idx) => a + (this.ffnMaskState[idx] === 1 ? b : 0), 0); }

    async growHead() { 
        if (this.isDisposed || !this.wO || this.wO.isDisposed || this.activeHeads >= this.maxHeads) return false; 
        let grownHeadIdx = -1;
        for(let i=0; i<this.headMaskState.length; i++) { 
            if(this.headMaskState[i] === 0) { 
                this.headMaskState[i] = 1; 
                grownHeadIdx = i;
                break; 
            } 
        } 
        if (grownHeadIdx === -1) return false;
        this.activeHeads++; 

        const wOData = Array.from(await this.wO.data());
        if (this.isDisposed || this.wO.isDisposed) return false;

        const startRow = grownHeadIdx * this.headDim;
        const endRow = startRow + this.headDim;
        for (let r = startRow; r < endRow; r++) {
            for (let c = 0; c < this.dModel; c++) {
                wOData[r * this.dModel + c] = 0.0;
            }
        }
        tf.tidy(() => {
            if (!this.wO.isDisposed) {
                this.wO.assign(tf.tensor2d(wOData, [this.attnDim, this.dModel]));
            }
        });
        return true; 
    }
    
    async growFFN(amount) { 
        if (this.isDisposed || !this.wUp || this.wUp.isDisposed || this.activeFF >= this.maxFF) return false; 
        const grownIndices = []; 
        for(let i=0; i<this.ffnMaskState.length; i++) { 
            if(this.ffnMaskState[i] === 0) { 
                this.ffnMaskState[i] = 1; 
                grownIndices.push(i);
                if(grownIndices.length >= amount) break; 
            } 
        } 
        if (grownIndices.length === 0) return false;

        this.activeFF += grownIndices.length; 
        this.updateMaskTensors();

        const [wUpData, bUpData, wDownData] = await Promise.all([
            this.wUp.data(),
            this.bUp.data(),
            this.wDown.data()
        ]);
        if (this.isDisposed || this.wUp.isDisposed || this.bUp.isDisposed || this.wDown.isDisposed) return false;

        const wUpArr = Array.from(wUpData);
        const bUpArr = Array.from(bUpData);
        const wDownArr = Array.from(wDownData);

        for (const j of grownIndices) {
            bUpArr[j] = 0.0;
            for (let r = 0; r < this.dModel; r++) {
                const u1 = Math.max(1e-7, Math.random());
                const u2 = Math.random();
                const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                wUpArr[r * this.maxFF + j] = z * 0.02;
            }
            for (let c = 0; c < this.dModel; c++) {
                wDownArr[j * this.dModel + c] = 0.0;
            }
        }

        tf.tidy(() => {
            if (!this.wUp.isDisposed && !this.bUp.isDisposed && !this.wDown.isDisposed) {
                this.wUp.assign(tf.tensor2d(wUpArr, [this.dModel, this.maxFF]));
                this.bUp.assign(tf.tensor1d(bUpArr));
                this.wDown.assign(tf.tensor2d(wDownArr, [this.maxFF, this.dModel]));
            }
        });
        return true; 
    }

    async consolidateSynapses(topFraction = 0.25) {
        if (this.isDisposed || !this.wUp || this.wUp.isDisposed || !this.wDown || this.wDown.isDisposed) return;
        const impTensor = tf.tidy(() => {
            const upImp = this.wUp.abs().mean(0); 
            const downImp = this.wDown.abs().mean(1); 
            return upImp.add(downImp);
        });
        const importance = await impTensor.data();
        impTensor.dispose();
        if (this.isDisposed) return;

        const activeScores = [];
        for (let i = 0; i < this.maxFF; i++) {
            if (this.ffnMaskState[i] === 1) {
                activeScores.push({ idx: i, score: importance[i] });
            }
        }
        activeScores.sort((a, b) => b.score - a.score);
        const countToLock = Math.max(2, Math.floor(activeScores.length * topFraction));
        for (let i = 0; i < countToLock && i < activeScores.length; i++) {
            this.consolidatedNeurons[activeScores[i].idx] = 1;
        }
    }
    
    async prune(rate = 0.1) { 
        if (this.isDisposed || !this.wUp || this.wUp.isDisposed || !this.wDown || this.wDown.isDisposed || this.activeFF <= 16) return 0; 
        const targetRemove = Math.max(1, Math.floor(this.activeFF * rate));
        
        const impTensor = tf.tidy(() => {
            const upImp = this.wUp.abs().mean(0); 
            const downImp = this.wDown.abs().mean(1); 
            return upImp.add(downImp);
        });
        const importance = await impTensor.data();
        impTensor.dispose();
        if (this.isDisposed) return 0;

        const activeIndices = [];
        for (let i = 0; i < this.maxFF; i++) {
            if (this.ffnMaskState[i] === 1 && this.consolidatedNeurons[i] === 0) {
                activeIndices.push({ idx: i, score: importance[i] });
            }
        }
        activeIndices.sort((a, b) => a.score - b.score);

        let removed = 0;
        for (let i = 0; i < activeIndices.length && removed < targetRemove; i++) {
            if (this.activeFF - removed <= 16) break;
            this.ffnMaskState[activeIndices[i].idx] = 0;
            removed++;
        }
        this.activeFF -= removed;
        this.updateMaskTensors();
        return removed;
    }
}

window.CORAL.OrganicBlock = OrganicBlock;
