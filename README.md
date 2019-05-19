# Nonogram solver with WASM

Build WASM module:

```bash
wasm-pack build --target no-modules --no-typescript
wasm-opt pkg/nono_bg.wasm -O3 -o pkg/nono_bg.wasm
```
