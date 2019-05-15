importScripts('nono.js');
const {
  solve,
  webpbn_board,
  WasmRenderer
} = wasm_bindgen;

async function init() {
  await wasm_bindgen('./nono_bg.wasm');
  self.addEventListener('message', response, false);
}

function collectDataForDescriptionsRender(id) {
  console.log("Worker collecting descriptions for puzzle #" + id);

  let result = {}
  const desc = WasmRenderer.from_board(id);
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


function collectDataForCellsRender(id) {
  console.log("Worker collecting cells for puzzle #" + id);

  let result = {}
  const desc = WasmRenderer.from_board(id);
  result.full_height = desc.full_height();
  result.full_width = desc.full_width();
  result.rows_number = desc.rows_number();
  result.cols_number = desc.cols_number();
  result.cells_as_colors = desc.cells_as_colors();

  return result;
}

function response(e) {
  var data = e.data;
  const id = data.id;

  switch (data.cmd) {
    case 'initBoard':
      console.log("Worker initializing puzzle #" + id);
      webpbn_board(id, data.content);
      self.postMessage({
        'result': 'initBoard',
        'id': id
      });
      break;

    case 'renderDescriptions':
      const objDesc = collectDataForDescriptionsRender(id);
      self.postMessage({
        'result': 'renderDescriptions',
        'obj': objDesc
      });
      break;

    case 'renderCells':
      const objCells = collectDataForCellsRender(id);
      self.postMessage({
        'result': 'renderCells',
        'obj': objCells
      });
      break;

    case 'solvePuzzle':
      console.log("Worker starting to solve puzzle #" + id);
      console.time("solve puzzle #" + id);
      solve(id);
      console.timeEnd("solve puzzle #" + id);
      self.postMessage({
        'result': 'solvePuzzle',
        'id': id
      });
      break;

    default:
      self.postMessage({
        'error': 'Unknown command: ' + data.cmd
      });
  };
}

init();
