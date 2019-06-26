importScripts('nono.js');
const {
  solve,
  board_with_content,
  white_color_code,
  Source,
  WasmRenderer
} = wasm_bindgen;

async function init() {
  await wasm_bindgen('./nono_bg.wasm');
  self.addEventListener('message', response, false);
}

const sourceUrlToName = {
  'https://webpbn.com': Source.WebPbnCom,
  'http://nonograms.org': Source.NonogramsOrg,
};

function collectDataForDescriptionsRender(source, id) {
  console.log("Worker collecting descriptions for puzzle #" + id);

  let result = {}
  const desc = WasmRenderer.from_board(source, id);
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


function collectDataForCellsRender(source, id) {
  console.log("Worker collecting cells for puzzle #" + id);

  let result = {}
  const desc = WasmRenderer.from_board(source, id);
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

  const cmd = data.cmd;
  const id = data.id;
  const sourceUrl = data.source;
  const sourceId = sourceUrlToName[sourceUrl];

  switch (cmd) {
    case 'initBoard':
      console.log("Worker initializing puzzle #" + id + " from source " + sourceUrl);
      board_with_content(sourceId, id, data.content);
      self.postMessage({
        'result': 'initBoard',
        'url': data.url,
        'source': sourceUrl,
        'id': id,
      });
      break;

    case 'renderDescriptions':
      const objDesc = collectDataForDescriptionsRender(sourceId, id);
      self.postMessage({
        'result': 'renderDescriptions',
        'obj': objDesc
      });
      break;

    case 'renderCells':
      const objCells = collectDataForCellsRender(sourceId, id);
      self.postMessage({
        'result': 'renderCells',
        'obj': objCells
      });
      break;

    case 'solvePuzzle':
      console.log("Worker starting to solve puzzle #" + id + " from source " + sourceUrl);
      console.time("solve puzzle #" + id);
      const t0 = performance.now();
      solve(sourceId, id);
      const t1 = performance.now();
      console.timeEnd("solve puzzle #" + id);

      self.postMessage({
        'result': 'solvePuzzle',
        'time': t1 - t0,
        'source': sourceUrl,
        'id': id
      });
      break;

    default:
      self.postMessage({
        'error': 'Unknown command: ' + cmd
      });
  };
}

init();
