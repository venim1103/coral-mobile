// C.O.R.A.L. Rotary Position Embeddings (1D Linear & 2D Axial RoPE)
window.CORAL = window.CORAL || {};

const get2DAxialRoPE = (gridSize, headDim, manifoldMode = '2d') => {
    return tf.tidy(() => {
        const spatialLen = gridSize * gridSize;
        const totalSeqLen = spatialLen + 1;
        const halfDim = Math.max(1, Math.floor(headDim / 2));

        const angles = [];
        angles.push(new Array(halfDim).fill(0));

        if (manifoldMode === '1d') {
            for (let s = 1; s <= spatialLen; s++) {
                const tokenAngles = [];
                for (let i = 0; i < halfDim; i++) {
                    const freq = 1.0 / Math.pow(10000, (2 * i) / Math.max(2, 2 * halfDim));
                    tokenAngles.push(s * freq);
                }
                angles.push(tokenAngles);
            }
        } else {
            const dimY = Math.max(1, Math.floor(halfDim / 2));
            const dimX = Math.max(1, halfDim - dimY);

            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    const tokenAngles = [];
                    for (let i = 0; i < dimY; i++) {
                        const freq = 1.0 / Math.pow(10000, (2 * i) / Math.max(2, 2 * dimY));
                        tokenAngles.push((r + 1) * freq);
                    }
                    for (let j = 0; j < dimX; j++) {
                        const freq = 1.0 / Math.pow(10000, (2 * j) / Math.max(2, 2 * dimX));
                        tokenAngles.push((c + 1) * freq);
                    }
                    angles.push(tokenAngles);
                }
            }
        }
        const anglesTensor = tf.tensor2d(angles, [totalSeqLen, halfDim]);
        const cosHalf = tf.cos(anglesTensor);
        const sinHalf = tf.sin(anglesTensor);
        let cos = tf.concat([cosHalf, cosHalf], 1);
        let sin = tf.concat([sinHalf, sinHalf], 1);
        if (headDim % 2 !== 0) {
            cos = tf.concat([cos, tf.ones([totalSeqLen, 1])], 1);
            sin = tf.concat([sin, tf.zeros([totalSeqLen, 1])], 1);
        }
        return { 
            cos: cos.reshape([1, totalSeqLen, headDim]), 
            sin: sin.reshape([1, totalSeqLen, headDim]) 
        };
    });
};

const applyRoPE = (x, headDim) => {
    const halfDim = Math.floor(headDim / 2);
    if (halfDim === 0) return x;
    const x1 = x.slice([0, 0, 0], [-1, -1, halfDim]);
    const x2 = x.slice([0, 0, halfDim], [-1, -1, halfDim]);
    let rotated = tf.concat([x2.neg(), x1], 2); 
    if (headDim % 2 !== 0) {
        const rem = x.slice([0, 0, halfDim * 2], [-1, -1, 1]);
        rotated = tf.concat([rotated, rem], 2);
    }
    return rotated;
};

Object.assign(window.CORAL, {
    get2DAxialRoPE,
    applyRoPE
});
