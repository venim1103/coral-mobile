// C.O.R.A.L. Offscreen Atlas Canvas Visualizers (Residual Stream, Synaptic Weights, Attention Maps)
(() => {
window.CORAL = window.CORAL || {};

const { useRef, useEffect } = React;

const SignalFlowViz = ({ residuals }) => {
    const canvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !residuals || !residuals.length) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const width = canvas.width; 
        const height = canvas.height; 
        const layerCount = residuals.length; 
        const layerHeight = height / layerCount;

        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offCanvas = offscreenCanvasRef.current;
        const atlasCols = 512;
        if (offCanvas.width !== atlasCols || offCanvas.height !== layerCount) {
            offCanvas.width = atlasCols;
            offCanvas.height = layerCount;
        }
        const offCtx = offCanvas.getContext('2d', { alpha: false });
        const imgData = offCtx.createImageData(atlasCols, layerCount);
        const buf32 = new Uint32Array(imgData.data.buffer);
        buf32.fill(0xFF090606);

        residuals.forEach((layer, lIdx) => {
            const data = layer.data;
            const len = data.length || 1;
            const rowOffset = lIdx * atlasCols;
            for (let c = 0; c < atlasCols; c++) {
                const srcIdx = Math.min(len - 1, Math.floor((c * len) / atlasCols));
                const val = data[srcIdx] || 0;
                const intensity = Math.floor(Math.tanh(val) * 255);
                let r = 0, g = 0, b = 0;
                if (intensity > 0) {
                    r = intensity;
                    g = intensity >> 1;
                    b = 0;
                } else {
                    const absI = Math.abs(intensity);
                    r = 0;
                    g = absI >> 1;
                    b = absI;
                }
                buf32[rowOffset + c] = (255 << 24) | (b << 16) | (g << 8) | r;
            }
        });

        offCtx.putImageData(imgData, 0, 0);
        ctx.fillStyle = '#060609'; 
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;

        const isCompact = layerCount > 5;
        const barYOffset = isCompact ? 1 : 13;
        const barHeight = isCompact ? Math.max(4, Math.floor(layerHeight - 2)) : Math.max(2, Math.floor(layerHeight - 15));

        residuals.forEach((layer, lIdx) => {
            const y = lIdx * layerHeight; 
            ctx.drawImage(offCanvas, 0, lIdx, atlasCols, 1, 0, y + barYOffset, width, barHeight);

            if (isCompact) {
                ctx.fillStyle = 'rgba(6, 6, 9, 0.82)';
                ctx.fillRect(2, y + 1, 56, Math.max(8, layerHeight - 2));
                ctx.fillStyle = '#e5e7eb'; 
                ctx.font = '8px monospace'; 
                ctx.fillText(layer.name.toUpperCase(), 4, y + layerHeight - 3);
            } else {
                ctx.fillStyle = '#9ca3af'; 
                ctx.font = '9px monospace'; 
                ctx.fillText(layer.name.toUpperCase(), 4, y + 10);
            }

            if (lIdx < layerCount - 1) { 
                ctx.fillStyle = '#1c1c24'; 
                ctx.fillRect(0, y + layerHeight - 1, width, 1); 
            }
        });
    }, [residuals]);
    return <canvas ref={canvasRef} width={512} height={140} className="w-full h-full canvas-container"/>;
};

const MultiBlockViz = ({ blocks, rows, cols }) => {
    const canvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !blocks || !blocks.length) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const numBlocks = blocks.length;
        const blockHeight = height / numBlocks;
        ctx.fillStyle = '#060609';
        ctx.fillRect(0, 0, width, height);

        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offCanvas = offscreenCanvasRef.current;
        const totalRows = rows * numBlocks;
        if (offCanvas.width !== cols || offCanvas.height !== totalRows) {
            offCanvas.width = cols;
            offCanvas.height = totalRows;
        }
        const offCtx = offCanvas.getContext('2d', { alpha: false });

        const imgData = offCtx.createImageData(cols, totalRows);
        const buf32 = new Uint32Array(imgData.data.buffer);
        const bgPixel = 0xFF090606; 
        buf32.fill(bgPixel);

        blocks.forEach((blockData, idx) => {
            const w = blockData.w;
            const m = blockData.m;
            const consolidatedMask = blockData.c;
            const blockRowStart = idx * rows;

            for (let r = 0; r < rows; r++) {
                const srcRowOffset = r * cols;
                const dstRowOffset = (blockRowStart + r) * cols;
                for (let colIdx = 0; colIdx < cols; colIdx++) {
                    if (colIdx >= m.length) break;
                    if (m[colIdx] !== 1) continue;

                    const val = w[srcRowOffset + colIdx];
                    if (val === undefined) continue;

                    const isMyelinated = consolidatedMask && consolidatedMask[colIdx] === 1;
                    const intensity = Math.min(255, Math.abs(val) * 800);
                    let pixelColor;
                    if (isMyelinated && r < 2) {
                        pixelColor = (255 << 24) | (50 << 16) | (210 << 8) | 255;
                    } else if (val > 0) {
                        const green = Math.max(0, 50 - (intensity >> 2));
                        pixelColor = (255 << 24) | (0 << 16) | (green << 8) | 255;
                    } else {
                        const green = Math.max(0, 70 - (intensity >> 2));
                        pixelColor = (255 << 24) | (255 << 16) | (green << 8) | 0;
                    }
                    buf32[dstRowOffset + colIdx] = pixelColor;
                }
            }
        });

        offCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offCanvas, 0, 0, width, height);

        blocks.forEach((blockData, idx) => {
            const yOffset = idx * blockHeight;
            const { label, activeFF, activeHeads, consolidated } = blockData;
            ctx.fillStyle = 'rgba(0,0,0,0.78)';
            ctx.fillRect(2, yOffset + 2, 155, 14);
            ctx.fillStyle = '#e5e7eb'; 
            ctx.font = '9px monospace'; 
            ctx.fillText(`${label} (${activeFF}N | ${activeHeads}H | ${consolidated||0}🔒)`, 5, yOffset + 12); 
            if (idx > 0) { 
                ctx.fillStyle = '#262633'; 
                ctx.fillRect(0, yOffset, width, 1); 
            }
        });
    }, [blocks, rows, cols]);

    return <canvas ref={canvasRef} width={512} height={140} className="w-full h-full canvas-container"/>;
};

const AttentionViz = ({ attentionData, activeBlockIndex, setBlockIndex, selectedPixel }) => {
    const canvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);

    const safeIndex = Math.min(activeBlockIndex, Math.max(0, attentionData.length - 1)); 
    const dataObj = attentionData[safeIndex]; 
    const data = dataObj ? dataObj.data : null; 
    const taskRouting = dataObj ? dataObj.taskRouting : null;
    const mask = dataObj ? dataObj.mask : null; 
    const heads = dataObj ? (dataObj.maxHeads || 4) : 4;
    const seqLen = dataObj ? dataObj.seqLen : 16;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.fillStyle = '#060609';
        ctx.fillRect(0, 0, width, height);

        const slotWidth = width / heads;
        const headRenderSize = Math.min(height - 18, slotWidth - 6);

        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offCanvas = offscreenCanvasRef.current;
        const atlasWidth = heads * seqLen;
        if (offCanvas.width !== atlasWidth || offCanvas.height !== seqLen) {
            offCanvas.width = atlasWidth;
            offCanvas.height = seqLen;
        }
        const offCtx = offCanvas.getContext('2d', { alpha: false });

        const imgData = offCtx.createImageData(atlasWidth, seqLen);
        const buf32 = new Uint32Array(imgData.data.buffer);
        buf32.fill(0xFF090606);

        let activeIdx = 0;
        for (let h = 0; h < heads; h++) {
            const isActive = mask ? mask[h] === 1 : (h === 0);
            if (!isActive) continue;

            const headDataOffset = activeIdx * seqLen * seqLen;
            const atlasColOffset = h * seqLen;
            activeIdx++;

            for (let r = 0; r < seqLen; r++) {
                const srcRowOffset = r * seqLen;
                const dstRowOffset = r * atlasWidth + atlasColOffset;
                for (let c = 0; c < seqLen; c++) {
                    const val = data[headDataOffset + srcRowOffset + c] || 0;
                    const intensity = Math.min(255, Math.floor(val * 255 * (seqLen / 8)));
                    const red = Math.min(255, Math.floor(intensity * 1.8));
                    const green = Math.floor(intensity * 0.9);
                    const blue = Math.max(20, 60 - intensity);
                    buf32[dstRowOffset + c] = (255 << 24) | (blue << 16) | (green << 8) | red;
                }
            }
        }

        offCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = false;

        let activeIdxRender = 0;
        for (let h = 0; h < heads; h++) {
            const isActive = mask ? mask[h] === 1 : (h === 0);
            const xOffset = h * slotWidth + (slotWidth - headRenderSize) / 2;
            const yOffset = 4;

            if (!isActive) { 
                ctx.strokeStyle = '#1a1a24'; 
                ctx.strokeRect(xOffset, yOffset, headRenderSize, headRenderSize);
                ctx.fillStyle = '#374151'; 
                ctx.font = '9px monospace'; 
                ctx.fillText(`H${h+1} (OFF)`, xOffset + 4, yOffset + headRenderSize + 11);
                continue; 
            }

            ctx.drawImage(
                offCanvas,
                h * seqLen, 0, seqLen, seqLen,
                xOffset, yOffset, headRenderSize, headRenderSize
            );

            if (selectedPixel !== null && selectedPixel < seqLen) {
                const cellSize = headRenderSize / seqLen;
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
                ctx.lineWidth = 1;
                ctx.strokeRect(xOffset, yOffset + (selectedPixel * cellSize), headRenderSize, Math.max(1, cellSize));
            }

            let taskAttnAvg = 0;
            if (taskRouting) {
                for (let s = 0; s < seqLen; s++) {
                    taskAttnAvg += (taskRouting[activeIdxRender * seqLen + s] || 0);
                }
                taskAttnAvg = Math.round((taskAttnAvg / seqLen) * 100);
            }
            activeIdxRender++;

            ctx.fillStyle = '#38bdf8'; 
            ctx.font = '9px monospace'; 
            ctx.fillText(`H${h+1} (Task:${taskAttnAvg}%)`, xOffset + 2, yOffset + headRenderSize + 11);
        }
    }, [data, taskRouting, mask, heads, seqLen, selectedPixel]);

    return (
        <div className="w-full h-full relative group">
             <canvas ref={canvasRef} width={512} height={140} className="w-full h-full canvas-container"/>
             <div className="absolute top-2 right-2 flex flex-wrap gap-1 bg-black/80 p-1.5 rounded-lg border border-gray-800 backdrop-blur-sm max-w-[260px] justify-end">
                {attentionData.map((d, idx) => ( 
                    <button key={idx} onClick={() => setBlockIndex(idx)} className={`text-[9px] px-2 py-0.5 rounded font-mono border transition-all ${idx === safeIndex ? 'bg-sky-500/20 text-sky-300 border-sky-500/50' : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800'}`}>
                        {d.label}
                    </button> 
                ))}
             </div>
        </div>
    );
};

Object.assign(window.CORAL, {
    SignalFlowViz,
    MultiBlockViz,
    AttentionViz
});
})();
