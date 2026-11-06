# C.O.R.A.L. Mobile

> **Continual Organic Recurrent Attention Learning**  
> A self-evolving, mobile-optimized multimodal transformer cortex powered by TensorFlow.js and WebGPU that learns, adapts, and consolidates symbolic reasoning tasks in real time directly in the browser.

[![Live Demo](https://img.shields.io/badge/demo-live%20on%20GitHub%20Pages-emerald?style=for-the-badge&logo=github)](https://venim1103.github.io/coral-mobile/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.17.0-orange?style=for-the-badge&logo=tensorflow)](https://js.tensorflow.org)
[![WebGPU](https://img.shields.io/badge/Backend-WebGPU%20%7C%20CPU-blueviolet?style=for-the-badge)](https://www.w3.org/TR/webgpu/)
[![Architecture](https://img.shields.io/badge/Architecture-Organic%20Transformer-cyan?style=for-the-badge)]()
[![Zero Build](https://img.shields.io/badge/Build-Zero--Build%20Static-brightgreen?style=for-the-badge)]()

---

## Overview

**C.O.R.A.L.** (*Continual Organic Recurrent Attention Learning*) is an experimental neural architecture engineered for on-device lifelong learning and symbolic reasoning (inspired by the ARC-AGI benchmark). 

Unlike conventional fixed-parameter transformers, C.O.R.A.L. features **Zero-Shock Dynamic Neurogenesis**, **Myelinated Synaptic Armor**, **Recurrent Universal Pondering Loops**, and **Flexible Positional Manifolds** (1D Sequential and 2D Axial RoPE) to train and retain multi-task knowledge without catastrophic forgetting—operating entirely on edge devices and mobile browsers.

---

## Key Features & Architectural Innovations

### 1. Recurrent Universal Pondering Loop
- **Adaptive Thinking Depth ($K=1..4$)**: Dynamically recirculates latent token states through shared cortical layers before decoding.
- **Virtual Depth Multiplication**: A 3-layer organic cortex pondering for $K=4$ steps achieves an effective computational depth of **12 layers with zero parameter overhead**.
- **Prefix-Detached BPTT**: Decouples earlier recurrence steps outside the autograd tape to stabilize training gradients while preserving temporal reasoning capacity.

### 2. Zero-Shock Dynamic Neurogenesis
- **On-the-Fly Synaptic Expansion**: Expand feed-forward neurons (`+GROW`) and self-attention heads at runtime.
- **Zero Loss Disruption**: New incoming projections initialize with Gaussian priors while outgoing weights are strictly zero-initialized ($W_{\text{out}} = 0$), guaranteeing $f_{\text{new}}(x) \equiv f_{\text{old}}(x)$ at birth.

### 3. Synaptic Consolidation & Gradient-Protected Sleep
- **Myelinated Synaptic Armor**: Neurons with top importance scores across mastered curriculum tiers are consolidated, shielding them from destructive parameter drift.
- **Sleep Pruning**: Low-importance plastic synapses are trimmed during sleep phases to preserve FLOPS and model sparsity without sacrificing task accuracy.

### 4. Dual Readout: 1D Scalar & Symbolic Categorical Vocab
- **Continuous 1D Scalar Mode**: Smooth spatial regression head for dense real-valued transformations.
- **Symbolic Vocabulary Mode ($V/10$)**: Softmax-categorical projection over discrete ARC symbol anchors (`Sym 0`, `Sym 9`, `Sym 1..8`).
- **Zero-Shock Class Expansion**: Unlock symbol slots (`+2 V`) with shielded logit biases ($-6.0$) and a pure $\text{float32}$ sharp Boltzmann target formulation that prevents autograd tape collisions.

### 5. 2D Axial RoPE & 1D Sequential Manifolds
- **2D Axial Spatial RoPE**: Rotates query and key projections along both vertical ($y$) and horizontal ($x$) coordinate planes.
- **1D Sequential RoPE**: Switch dynamically to linear sequence positional encodings for sequence or cellular automata tasks.

### 6. Interactive Few-Shot Sandbox (Tier 21)
- **Touch-First Paint Canvas**: Design multi-pair input/target ARC examples with 10-symbol palettes and 60 FPS mobile drag painting.
- **Algorithmic Presets**: Instant evaluation for 90° matrix rotations, 1D Rule 110 cellular automata, and bijective color swaps.
- **Toroidal Augmenters**: Real-time toroidal spatial shifts $(dr, dc)$ and symbol color permutations $\pi(1..9)$ to prevent overfitting.

### 7. DNA Vault & Adam Momentum Serialization
- **Full Model & Optimizer Export**: Serialize all model weights, topology masks, and Adam momentum tensors ($m, v, \beta_1, \beta_2$) into JSON.
- **Zero-Wobble Resume**: Resume training on mobile or desktop without optimizer warm-up instability or momentum loss.

---

## Live Demo

Experience C.O.R.A.L. directly in your browser with zero installation:

🔗 **[https://venim1103.github.io/coral-mobile/](https://venim1103.github.io/coral-mobile/)**

Supports mobile Safari, iOS Chrome, Android Chrome, and all modern desktop browsers.

---

## Curriculum Matrix (21 Tiers)

| Tier | Task | Category | Description |
| :---: | :--- | :---: | :--- |
| **T1** | Echo (Identity) | Routing | Direct copy identity function |
| **T2** | Invert | Logic | Symbol complement output ($9 - x$) |
| **T3** | Shift Right | Routing | Horizontal circular shift by 1 column |
| **T4** | Checkerboard | Logic | Alternating 2D spatial parity pattern |
| **T5** | Noise Removal | Logic | Prunes isolated single-pixel activations |
| **T6** | Cross Detect | Logic | Detects `+` intersection topologies |
| **T7** | Flood Approx | Logic | Diagonal wavefront distance calculation |
| **T8** | Shift Down | Routing | Vertical circular shift down 1 row |
| **T9** | Local Max | Logic | Max activation among Von Neumann neighbors |
| **T10** | Vertical Edge | Routing | Absolute gradient with vertical neighbor |
| **T11** | Horizontal Edge | Routing | Absolute gradient with horizontal neighbor |
| **T12** | Mirror X | Routing | Horizontal axis reflection |
| **T13** | Object Count | Logic | Active token count modulo 10 |
| **T14** | Fibonacci Sum | Logic | Autoregressive row sum modulo 10 |
| **T15** | Box Surround | Logic | Boundary detection surrounding active zones |
| **T16** | Gradient Sum | Logic | Upstream spatial accumulation |
| **T17** | Dilation | Routing | Morphological neighborhood expansion |
| **T18** | Corner Detect | Logic | Coincident horizontal & vertical step corners |
| **T19** | Game of Life | Logic | 1-step Conway cellular automaton |
| **T20** | Gravity | Logic | Dynamic token tumble to bottom row |
| **T21** | Custom Sandbox | Custom | Interactive few-shot user-painted rules |

---

## Repository Architecture

The project is structured into modular ES/JSX components deployed via zero-build static hosting:

```text
coral-mobile/
├── index.html                     # Lightweight entry shell with diagnostics
├── css/
│   └── coral.css                  # Custom styling, range sliders & animations
└── src/
    ├── core/
    │   ├── curriculum.js          # Curriculum definitions, tiers & palettes
    │   └── dataset.js             # Procedural data generation & augmenters
    ├── engine/
    │   ├── rope.js                # 1D & 2D Axial RoPE tensor math
    │   ├── OrganicBlock.js        # Dynamic self-attention & FFN module
    │   ├── CoralModel.js          # Organic cortex model, recurrence & loss
    │   └── dnaVault.js            # Serializer for weights & optimizer moments
    ├── components/
    │   ├── Icons.jsx              # Vector SVG icon components
    │   ├── TelemetryCharts.jsx    # Real-time loss & capacity SVG visualizers
    │   ├── CortexVisualizers.jsx  # Attention, weight atlas & stream canvases
    │   └── Modals.jsx             # DNA Vault & Architecture info modals
    ├── workspaces/
    │   ├── StudioWorkspace.jsx    # Tab 1: Cortex Studio & Token Softmax
    │   ├── TelemetryWorkspace.jsx # Tab 2: Cortical Anatomy & Retention Matrix
    │   └── SandboxWorkspace.jsx   # Tab 3: Few-Shot Painter & Preset Sandbox
    └── App.jsx                    # Root state container & train loop
```

---

## Local Development

Run locally using any static web server:

```bash
# Clone the repository
git clone https://github.com/venim1103/coral-mobile.git
cd coral-mobile

# Start a local static HTTP server (Python 3)
python3 -m http.server 8080

# Open in browser
# http://localhost:8080
```

*Note: No `npm install`, Node.js bundling, or build steps are required. Everything executes natively in browser runtimes.*

---

## Hardware Acceleration & Backends

- **CPU Backend (Default)**: Broad compatibility with WebAssembly-backed deterministic execution.
- **WebGPU Backend**: Instant toggle via header bar for hardware-accelerated compute shaders on compatible mobile and desktop GPUs.

---

## License

Distributed under the Apache 2.0 License. See [LICENSE](LICENSE) for details.
