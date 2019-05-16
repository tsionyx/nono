# Nonogram solver with WASM

Build with

```bash
wasm-pack build --target no-modules --no-typescript
wasm-opt pkg/nono_bg.wasm -O3 -o pkg/nono_bg.wasm
```


To deploy

```bash
cp www/* pkg/
git checkout gh-pages
cp pkg/* .

git add *.html *.js *.wasm README.md
git commit -m 'new release'
git push origin gh-pages
```
