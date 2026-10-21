// C.O.R.A.L. Core Curriculum & Palette Configuration
(() => {
window.CORAL = window.CORAL || {};

const VAL_SET_SIZE = 128; 
const NUM_TASKS = 21;
const MAX_PONDER_STEPS = 4;
const MAX_VOCAB = 10;

// Frequency-ordered symbol anchors: Slot 0 = 0.0 (Sym 0), Slot 1 = 0.9 (Sym 9), Slots 2..9 = 0.1..0.8 (Syms 1..8)
const VOCAB_ANCHOR_VALUES = [0.0, 0.9, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
const VOCAB_SLOT_LABELS   = ['Sym 0', 'Sym 9', 'Sym 1', 'Sym 2', 'Sym 3', 'Sym 4', 'Sym 5', 'Sym 6', 'Sym 7', 'Sym 8'];
const VOCAB_SLOT_DIGITS   = [0, 9, 1, 2, 3, 4, 5, 6, 7, 8];

const ARC_PALETTE = [
    '#0b0b12', // 0: Void Black
    '#0074D9', // 1: Cobalt Blue
    '#FF4136', // 2: Crimson Red
    '#2ECC40', // 3: Emerald Green
    '#FFDC00', // 4: Cyber Gold
    '#AAAAAA', // 5: Sterling Silver
    '#F012BE', // 6: Neon Magenta
    '#FF851B', // 7: Solar Orange
    '#38BDF8', // 8: Sky Cyan
    '#A855F7'  // 9: Royal Violet
];

const getPixelColor = (val0to10, colorMode = 'gray') => {
    const clamped = Math.max(0, Math.min(10, val0to10));
    if (colorMode === 'arc') {
        const digit = Math.min(9, Math.max(0, Math.round(clamped)));
        return ARC_PALETTE[digit];
    }
    const g = Math.round(clamped * 25.5);
    return `rgb(${g}, ${g}, ${g})`;
};

const TIERS = [
    { id: 1, name: "Echo (Identity)", type: 'Routing', desc: "Direct copy identity function.", fn: (g, i, r, c, w, h) => g[i] },
    { id: 2, name: "Invert", type: 'Logic', desc: "Output = 9 - Input (Symbol Complement).", fn: (g, i, r, c, w, h) => 9 - g[i] },
    { id: 3, name: "Shift Right", type: 'Routing', desc: "Shift horizontally by 1 pixel.", fn: (g, i, r, c, w, h) => g[r*w + (c > 0 ? c-1 : w-1)] },
    { id: 4, name: "Checkerboard", type: 'Logic', desc: "Alternating spatial parity pattern.", fn: (g, i, r, c, w, h) => (r+c)%2 === 0 ? 9 : 0 },
    { id: 5, name: "Noise Removal", type: 'Logic', desc: "Prune isolated single pixels.", fn: (g, i, r, c, w, h) => {
        let s=0;
        if(r>0) s+=g[(r-1)*w+c]; if(c>0) s+=g[r*w+c-1];
        if(r<h-1) s+=g[(r+1)*w+c]; if(c<w-1) s+=g[r*w+c+1];
        return s===0 ? 0 : g[i];
    }},
    { id: 6, name: "Cross Detect", type: 'Logic', desc: "Detect cross intersections (+).", fn: (g, i, r, c, w, h) => {
        if(r===0||r===h-1||c===0||c===w-1) return 0;
        return (g[i]>5 && g[(r-1)*w+c]>5 && g[(r+1)*w+c]>5 && g[r*w+c-1]>5 && g[r*w+c+1]>5) ? 9 : 0;
    }},
    { id: 7, name: "Flood Approx", type: 'Logic', desc: "Wavefront diagonal distance.", fn: (g, i, r, c, w, h) => (g[i]+r+c)%10 },
    { id: 8, name: "Shift Down", type: 'Routing', desc: "Shift vertically down 1 row.", fn: (g, i, r, c, w, h) => g[(r > 0 ? r-1 : h-1)*w + c] },
    { id: 9, name: "Local Max", type: 'Logic', desc: "Max value among Von Neumann neighbors.", fn: (g, i, r, c, w, h) => {
        let m=g[i];
        if(r>0) m=Math.max(m,g[(r-1)*w+c]); if(c>0) m=Math.max(m,g[r*w+c-1]);
        return m;
    }},
    { id: 10, name: "Vertical Edge", type: 'Routing', desc: "Difference with vertical neighbor.", fn: (g, i, r, c, w, h) => Math.abs(g[i] - (r>0?g[(r-1)*w+c]:0)) },
    { id: 11, name: "Horizontal Edge", type: 'Routing', desc: "Difference with horizontal neighbor.", fn: (g, i, r, c, w, h) => Math.abs(g[i] - (c>0?g[r*w+c-1]:0)) },
    { id: 12, name: "Mirror X", type: 'Routing', desc: "Horizontal reflection.", fn: (g, i, r, c, w, h) => g[r*w + ((w-1)-c)] },
    { id: 13, name: "Object Count", type: 'Logic', desc: "Count active tokens modulo 10.", fn: (g, i, r, c, w, h) => g.filter(v=>v>0).length % 10 },
    { id: 14, name: "Fibonacci Sum", type: 'Logic', desc: "Sum previous 2 row values.", fn: (g, i, r, c, w, h) => c < 2 ? g[i] : (g[r*w + c-1] + g[r*w + c-2]) % 10 },
    { id: 15, name: "Box Surround", type: 'Logic', desc: "Surrounded by active pixels.", fn: (g, i, r, c, w, h) => {
        if(r===0||r===h-1||c===0||c===w-1) return 0;
        return (g[(r-1)*w+c]>0 && g[(r+1)*w+c]>0 && g[r*w+c-1]>0 && g[r*w+c+1]>0) ? 9 : 0;
    }},
    { id: 16, name: "Gradient Sum", type: 'Logic', desc: "Accumulate upstream values.", fn: (g, i, r, c, w, h) => {
        let s = 0; if(r>0) s+=g[(r-1)*w+c]; if(c>0) s+=g[r*w+(c-1)];
        return r===0&&c===0 ? g[i] : s%10;
    }},
    { id: 17, name: "Dilation", type: 'Routing', desc: "Morphological expansion.", fn: (g, i, r, c, w, h) => {
        let hit=false; if(g[i]>5) hit=true;
        if(r>0 && g[(r-1)*w+c]>5) hit=true; if(c>0 && g[r*w+c-1]>5) hit=true;
        return hit ? 9 : 0;
    }},
    { id: 18, name: "Corner Detect", type: 'Logic', desc: "Coincident horizontal & vertical steps.", fn: (g, i, r, c, w, h) => {
        const l = c>0?g[r*w+c-1]:0; const t = r>0?g[(r-1)*w+c]:0;
        return (Math.abs(g[i]-l)>2 && Math.abs(g[i]-t)>2) ? 9 : 0;
    }},
    { id: 19, name: "Game of Life", type: 'Logic', desc: "1 Step Conway Cellular Automaton.", fn: (g, i, r, c, w, h) => {
        let n=0;
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
            if(dr===0&&dc===0) continue;
            const nr=r+dr; const nc=c+dc;
            if(nr>=0&&nr<h&&nc>=0&&nc<w&&g[nr*w+nc]>4) n++;
        }
        const a = g[i]>4;
        if(a && (n<2||n>3)) return 0; if(!a && n===3) return 9; return a?9:0;
    }},
    { id: 20, name: "Gravity", type: 'Logic', desc: "Tokens tumble to base row.", fn: (g, i, r, c, w, h) => {
        let col=[]; for(let k=0;k<h;k++) col.push(g[k*w+c]);
        const n = col.filter(x=>x>2).length;
        return ((h-1)-r)<n ? 9 : 0;
    }},
    { id: 21, name: "Custom Sandbox", type: 'Custom', desc: "User-designed few-shot pairs or custom rule.", fn: (g, i, r, c, w, h) => g[i] }
];

Object.assign(window.CORAL, {
    VAL_SET_SIZE,
    NUM_TASKS,
    MAX_PONDER_STEPS,
    MAX_VOCAB,
    VOCAB_ANCHOR_VALUES,
    VOCAB_SLOT_LABELS,
    VOCAB_SLOT_DIGITS,
    ARC_PALETTE,
    getPixelColor,
    TIERS
});
})();
