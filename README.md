# Nonogram solver with WASM

The last version of this application should be deployed on [github hosting](https://tsionyx.github.io/nono/).
To solve a puzzle, ensure that you entered valid description and click 'Solve' button (or simply hit _Ctrl+Enter_).

The descriptions can be in a wide variety of formats:
  - formats that can be [exported from webpbn](https://webpbn.com/export.cgi):
    _faase, ish, keen, makhorin, nin, olsak, ss, syro_. All of them, except _olsak_,
    supports only black-and-white puzzles;
  - the encoded format of https://nonograms.org.


Special counter inputs allow downloading puzzles by the ID from the two collections:
- https://webpbn.com/
- http://www.nonograms.org/


Some query arguments are supported:
- **id** - download puzzle from https://webpbn.com/ when the page is ready (https://tsionyx.github.io/nono/?id=6574);
- **noid** - download puzzle from http://www.nonograms.org/ when the page is ready (https://tsionyx.github.io/nono/?noid=22318);
- **s** - the puzzle description can be specified in full form here to paste it into source field
(https://tsionyx.github.io/nono/?s=1%201%0A0%0A1%201%0A%0A1%201%0A0%0A1%201).
You can generate the direct link to puzzle with the 'Share' button.
- **solutions** - specify how many solutions should be found before the puzzle should be considered solved
(by default _solutions=2_ used to verify if the puzzle is unique);


### Build WASM module:

```bash
wasm-pack build --target no-modules --no-typescript
wasm-opt pkg/nono_bg.wasm -O3 -o pkg/nono_bg.wasm
```

### Run the local copy

```
cd www
tsc static/index.ts
cd static
python3 -m http.server
```

---


Special thanks to Chugunnyy K.A. (@KyberPrizrak) for permission to use his site http://www.nonograms.org/
for demonstrating this solver's abilities.
