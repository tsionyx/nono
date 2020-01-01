importScripts('nono.js');
const {
  init_board,
  solve,
  white_color_code,
  WasmRenderer
} = wasm_bindgen;

async function init() {
  await wasm_bindgen('./nono_bg.wasm');
  self.addEventListener('message', response, false);
}

function collectDataForDescriptionsRender(hash) {
  console.log("Worker collecting descriptions for puzzle #" + hash);

  let result = {}
  const desc = WasmRenderer.for_board(hash);
  result.full_height = desc.full_height();
  result.full_width = desc.full_width();
  result.rows = [];
  result.rowsColors = [];
  result.cols = [];
  result.colsColors = [];

  const rows_number = desc.rows_number();
  for (let i = 0; i < rows_number; i++) {
    result.rows.push(desc.get_row(i));
    result.rowsColors.push(desc.get_row_colors(i));
  }

  const cols_number = desc.cols_number();
  for (let i = 0; i < cols_number; i++) {
    result.cols.push(desc.get_column(i));
    result.colsColors.push(desc.get_column_colors(i));
  }
  return result;
}


function collectDataForCellsRender(hash) {
  console.log("Worker collecting cells for puzzle #" + hash);

  let result = {}
  const desc = WasmRenderer.for_board(hash);
  result.full_height = desc.full_height();
  result.full_width = desc.full_width();
  result.rows_number = desc.rows_number();
  result.cols_number = desc.cols_number();
  result.cells_as_colors = desc.cells_as_colors();
  result.white_color_code = white_color_code();

  return result;
}

function response(e) {
  var data = e.data;

  switch (data.cmd) {
    case 'initBoard':
      const hash_id = init_board(data.content);
      console.log("Worker initialized puzzle with hash " + hash_id);
      self.postMessage({
        'result': 'initBoard',
        'hash': hash_id,
      });
      break;

    case 'renderDescriptions':
      const objDesc = collectDataForDescriptionsRender(data.hash);
      self.postMessage({
        'result': 'renderDescriptions',
        'obj': objDesc
      });
      break;

    case 'renderCells':
      const objCells = collectDataForCellsRender(data.hash);
      self.postMessage({
        'result': 'renderCells',
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
        'result': 'solvePuzzle',
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
