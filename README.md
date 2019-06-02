# Nonogram solver with WASM

Build WASM module:

```bash
wasm-pack build --target no-modules --no-typescript
wasm-opt pkg/nono_bg.wasm -O3 -o pkg/nono_bg.wasm
```

Special thanks to Chugunnyy K.A. (@KyberPrizrak) for permission to use his site http://www.nonograms.org/
for demonstrating this solver's abilities.
