importScripts('nono.js');
const {
  init_board,
  solve,
  WasmRenderer
} = wasm_bindgen;

async function init() {
  await wasm_bindgen('./nono_bg.wasm');
  self.addEventListener('message', response, false);
  self.postMessage({
    'result': 'init',
  });
}

function collectDataForDescriptionsRender(hash) {
  console.log("Worker collecting descriptions for puzzle #" + hash);

  const renderer = new WasmRenderer(hash);
  let result = {
    full_height: renderer.full_height,
    full_width: renderer.full_width,
    rows: [],
    rowsColors: [],
    cols: [],
    colsColors: []
  };

  const rows_number = renderer.rows_number;
  for (let i = 0; i < rows_number; i++) {
    result.rows.push(renderer.get_row(i));
    result.rowsColors.push(renderer.get_row_colors(i));
  }

  const cols_number = renderer.cols_number;
  for (let i = 0; i < cols_number; i++) {
    result.cols.push(renderer.get_column(i));
    result.colsColors.push(renderer.get_column_colors(i));
  }
  return result;
}

function collectDataForCellsRender(hash) {
  console.log("Worker collecting cells for puzzle #" + hash);

  const renderer = new WasmRenderer(hash);
  return {
    full_height: renderer.full_height,
    full_width: renderer.full_width,
    rows_number: renderer.rows_number,
    cols_number: renderer.cols_number,
    cells_as_colors: renderer.cells_as_colors,
    white_color_code: WasmRenderer.white_color_code()
  };
}

function response(e) {
  var data = e.data;

  console.log("Worker received a message: ", data);
  switch (data.cmd) {
    case 'initBoard':
      const hash_id = init_board(data.content);
      console.log("Worker initialized puzzle with hash " + hash_id);
      self.postMessage({
        'result': data.cmd,
        'hash': hash_id,
      });
      break;

    case 'renderDescriptions':
      const objDesc = collectDataForDescriptionsRender(data.hash);
      self.postMessage({
        'result': data.cmd,
        'obj': objDesc
      });
      break;

    case 'renderCells':
      const objCells = collectDataForCellsRender(data.hash);
      self.postMessage({
        'result': data.cmd,
        'obj': objCells
      });
      break;

    case 'solvePuzzle':
      const hash = data.hash;
      console.log("Worker starting to solve puzzle #" + hash);
      // try to find 2 solutions to check out if the puzzle has multiple solutions
      const maxSolutions = data.hasOwnProperty('maxSolutions') ? data.maxSolutions : 2;

      console.time("solve puzzle #" + hash);
      const t0 = performance.now();
      solve(hash, maxSolutions);
      const t1 = performance.now();
      console.timeEnd("solve puzzle #" + hash);

      self.postMessage({
        'result': data.cmd,
        'time': t1 - t0,
        'hash': hash,
      });
      break;

    default:
      self.postMessage({
        'error': 'Unknown command: ' + data.cmd
      });
  };
}

init();
