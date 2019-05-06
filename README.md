# Nonogram solver with WASM 


To further optimize speed, do this after `wasm-pack build`:

```
wasm-opt pkg/nono_bg.wasm -O3 -o pkg/nono_bg.wasm
```
