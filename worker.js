importScripts('nono.js') /* eslint-disable-line no-undef */
const {
  initBoard,
  solve,
  WasmRenderer
} = wasm_bindgen /* eslint-disable-line no-undef,camelcase */

async function init () {
  await wasm_bindgen('./nono_bg.wasm') /* eslint-disable-line no-undef */
  self.addEventListener('message', response, false)
  self.postMessage({
    result: 'init'
  })
}

function collectDataForDescriptionsRender (hash) {
  console.log('Worker collecting descriptions for puzzle #' + hash)

  const renderer = new WasmRenderer(hash)
  const result = {
    full_height: renderer.full_height,
    full_width: renderer.full_width,
    rows: [],
    rowsColors: [],
    cols: [],
    colsColors: []
  }

  const rowsNumber = renderer.rows_number
  for (let i = 0; i < rowsNumber; i++) {
    result.rows.push(renderer.get_row(i))
    result.rowsColors.push(renderer.get_row_colors(i))
  }

  const colsNumber = renderer.cols_number
  for (let i = 0; i < colsNumber; i++) {
    result.cols.push(renderer.get_column(i))
    result.colsColors.push(renderer.get_column_colors(i))
  }
  return result
}

function collectDataForCellsRender (hash) {
  console.log('Worker collecting cells for puzzle #' + hash)

  const renderer = new WasmRenderer(hash)
  return {
    full_height: renderer.full_height,
    full_width: renderer.full_width,
    rowsNumber: renderer.rows_number,
    colsNumber: renderer.cols_number,
    cells_as_colors: renderer.cells_as_colors,
    whiteColorCode: WasmRenderer.white_color_code()
  }
}

function response (e) {
  const data = e.data

  console.log('Worker received a message: ', data)
  switch (data.cmd) {
    case 'initBoard': {
      const hashId = initBoard(data.content)
      console.log('Worker initialized puzzle with hash ' + hashId)
      self.postMessage({
        result: data.cmd,
        hash: hashId
      })
      break
    }

    case 'renderDescriptions': {
      const objDesc = collectDataForDescriptionsRender(data.hash)
      self.postMessage({
        result: data.cmd,
        obj: objDesc
      })
      break
    }

    case 'renderCells': {
      const objCells = collectDataForCellsRender(data.hash)
      self.postMessage({
        result: data.cmd,
        obj: objCells
      })
      break
    }

    case 'solvePuzzle': {
      const hash = data.hash
      console.log('Worker starting to solve puzzle #' + hash)
      // try to find 2 solutions to check out if the puzzle has multiple solutions
      const hasMaxSolutions = Object.prototype.hasOwnProperty.call(data, 'maxSolutions')
      const maxSolutions = hasMaxSolutions ? data.maxSolutions : 2

      console.time('solve puzzle #' + hash)
      const t0 = performance.now()
      solve(hash, maxSolutions)
      const t1 = performance.now()
      console.timeEnd('solve puzzle #' + hash)

      self.postMessage({
        result: data.cmd,
        time: t1 - t0,
        hash: hash
      })
      break
    }

    default:
      self.postMessage({
        error: 'Unknown command: ' + data.cmd
      })
  };
}

init()
