const worker = new Worker('worker.js')
worker.addEventListener('message', workerCallback, false)

document.addEventListener('DOMContentLoaded', function (event) {
  initPage()
})

function initPage () {
  const $webpbnCounter = document.querySelector('#webpbnCounter')
  const $nonogramsOrgCounter = document.querySelector('#nonogramsOrgCounter')
  const $nonoSrcInput = <HTMLInputElement>document.querySelector('#nonoSrc')
  const $solveButton = <HTMLElement>document.querySelector('#solve')

  setKeyHandlerForLoading($webpbnCounter)
  setKeyHandlerForLoading($nonogramsOrgCounter)

  $nonoSrcInput.value = ''
  initFromArgs()

  $solveButton.addEventListener('click', function (event) {
    worker.postMessage({
      cmd: 'initBoard',
      content: $nonoSrcInput.value
    })
  })

  document.querySelector('#share').addEventListener('click', function (event) {
    const content = $nonoSrcInput.value
    if (content) {
      const encoded = encodeURIComponent(content)
      history.pushState(null, document.title, '?s=' + encoded)
    }
  })

  document.querySelector('#webpbnButton').addEventListener('click', function (event) {
    loadPuzzle(WEBPBN_SOURCE_URL, ($webpbnCounter as HTMLInputElement).valueAsNumber)
  })

  document.querySelector('#nonogramsOrgButton').addEventListener('click', function (event) {
    loadPuzzle(NONOGRAMS_SOURCE_URL, ($nonogramsOrgCounter as HTMLInputElement).valueAsNumber)
  })

  document.querySelector('body').addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.keyCode === 13) {
      $solveButton.click()
    }
  })
}

function setKeyHandlerForLoading (input) {
  input.addEventListener('keypress', function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 || event.which === 13) {
      // Cancel the default action, if needed
      event.preventDefault()

      const counter = event.target
      const value = counter.valueAsNumber
      if (value) {
        const sourceUrl = counter.name
        loadPuzzle(sourceUrl, parseInt(value))
      }
    }
  })
}

function initFromArgs () {
  const parameters = searchParams()

  const content = parameters.get('s')
  if (content) {
    (document.querySelector('#nonoSrc') as HTMLInputElement).value = content
  } else {
    const webPbnId = parseInt(parameters.get('id'))
    const nonogramsOrgId = parseInt(parameters.get('noid'))
    if (webPbnId) {
      console.log('Loading webpbn.com from query: ' + webPbnId);
      (document.querySelector('#webpbnCounter') as HTMLInputElement).value = webPbnId.toString()
      loadPuzzle(WEBPBN_SOURCE_URL, webPbnId)
    } else if (nonogramsOrgId) {
      console.log('Loading nonograms.org from query: ' + nonogramsOrgId);
      (document.querySelector('#nonogramsOrgCounter') as HTMLInputElement).value = nonogramsOrgId.toString()
      loadPuzzle(NONOGRAMS_SOURCE_URL, nonogramsOrgId)
    }
  }
}

function workerCallback (e) {
  const data = e.data

  console.log('Got response from worker: ', data)
  if (data.error) {
    console.error(data.error)
  }

  const hash = data.hash

  switch (data.result) {
    case 'init':
      break

    case 'initBoard': {
      worker.postMessage({
        cmd: 'renderDescriptions',
        hash: hash
      })

      const solveMsg = {
        cmd: 'solvePuzzle',
        hash: hash
      }
      const maxSolutions = intValFromQuery('solutions')
      if (!isNaN(maxSolutions)) {
        solveMsg['maxSolutions'] = maxSolutions /* eslint-disable-line dot-notation */
      }
      worker.postMessage(solveMsg)
      document.querySelector('#timeToSolve').innerHTML = 'Solving puzzle with hash ' + hash + '...'
      break
    }

    case 'renderDescriptions':
      renderPuzzleDesc(data.obj)
      break

    case 'renderCells':
      renderPuzzleCells(data.obj)
      break

    case 'solvePuzzle': {
      const timeMs = +data.time.toFixed(2)
      let timeAsStr = timeMs + 'ms'
      if (timeMs > 1000) {
        timeAsStr = (timeMs / 1000.0).toFixed(3) + ' seconds'
      }
      const msg = 'Time to solve the puzzle with hash ' + hash + ': ' + timeAsStr
      document.querySelector('#timeToSolve').innerHTML = msg
      worker.postMessage({
        cmd: 'renderCells',
        hash: hash
      })
      break
    }

    default:
      console.error('Unknown response from worker: ', data.result)
  }
}

// ========================= HTTP =========================
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'
const WEBPBN_SOURCE_URL = 'https://webpbn.com'
const NONOGRAMS_SOURCE_URL = 'http://nonograms.org'

const sourceUrlToPuzzleUrl = {
  [WEBPBN_SOURCE_URL]: WEBPBN_SOURCE_URL + '/export.cgi',
  [NONOGRAMS_SOURCE_URL]: NONOGRAMS_SOURCE_URL + '/nonograms2/i/'
}

const NONOGRAMS_ENCODED_SRC_RE = /var d=(\[[[\]\d, ]+\]);/gm

function successCallback (sourceUrl, puzzleUrl) {
  return function (xhttp) {
    const data = xhttp.responseText
    let src = data
    if (sourceUrl === NONOGRAMS_SOURCE_URL) {
      let match = null
      while ((match = NONOGRAMS_ENCODED_SRC_RE.exec(data)) !== null) {
        src = match[0]
      }
    }
    (document.querySelector('#nonoSrc') as HTMLInputElement).value = src
    document.querySelector('#originalUrl').innerHTML = '<a href=' + puzzleUrl + '>Original puzzle URL</a>'
    // clearCanvas();
  }
}

function failCallback (msg) {
  return function (xhttp) {
    document.querySelector('#originalUrl').innerHTML = 'Failed to get ' + msg + '.'
    console.error(xhttp)
  }
}

function requestWithCallbacks (successCallback, errorCallback) {
  const xhttp = new XMLHttpRequest()
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (Math.floor(this.status / 100) === 2) {
        successCallback(this)
      } else {
        errorCallback(this)
      }
    }
  }
  return xhttp
}

function doGet (url, successCallback, errorCallback) {
  const xhttp = requestWithCallbacks(successCallback, errorCallback)
  xhttp.open('GET', url, true)
  xhttp.send(null)
}

function doPost (url, body, successCallback, errorCallback) {
  const xhttp = requestWithCallbacks(successCallback, errorCallback)
  xhttp.open('POST', url, true)
  xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
  xhttp.send(body)
}

function loadPuzzle (sourceUrl, id) {
  if (!id) {
    console.log('Bad puzzle id: ', id)
    return
  }

  const msg = 'puzzle #' + id + ' from ' + sourceUrl
  document.querySelector('#originalUrl').innerHTML = 'Retrieving ' + msg + '...'
  let url = sourceUrlToPuzzleUrl[sourceUrl]

  let puzzleUrl
  if (sourceUrl === WEBPBN_SOURCE_URL) {
    puzzleUrl = sourceUrl + '/?id=' + id
    doPost(CORS_PROXY + url,
      'fmt=olsak&go=1&id=' + id,
      successCallback(sourceUrl, puzzleUrl),
      failCallback(msg))
  } else {
    url = url + id
    puzzleUrl = url
    doGet(CORS_PROXY + url,
      successCallback(sourceUrl, puzzleUrl),
      function (xhttp) {
        if (xhttp.status === 404) {
          const fixedUrl = url.replace('nonograms2', 'nonograms')
          console.log('Try to find the puzzle #' + id + ' on another URL: ' + fixedUrl)
          doGet(CORS_PROXY + fixedUrl,
            successCallback(sourceUrl, fixedUrl),
            failCallback(msg))
        } else {
          failCallback(msg)(xhttp)
        }
      })
  }
}

// ========================= RENDERING =========================
const CELL_SIZE = 20 // px
const GRID_COLOR = '#000000'
// const BLANK_COLOR = '#FFFFFF'

const ALMOST_ZERO = 5

function closeToBlack (intColor) {
  const r = intColor >> 16
  const gb = intColor % (1 << 16)
  const g = gb >> 8
  const b = gb % (1 << 8)

  return ((r <= ALMOST_ZERO) && (g <= ALMOST_ZERO) && (b <= ALMOST_ZERO))
}

function renderBlock (ctx, value, intColor, x, y) {
  const verticalOffset = CELL_SIZE * 0.8
  const horizontalOffset = CELL_SIZE * 0.15

  let blockColor = '#' + intColor.toString(16).padStart(6, '0')
  if (blockColor === '#ffffff') {
    // for more visual attention
    blockColor = '#cccccc'
  }
  ctx.fillStyle = blockColor
  ctx.fillRect(
    x * (CELL_SIZE + 1) + 1,
    y * (CELL_SIZE + 1) + 1,
    CELL_SIZE,
    CELL_SIZE
  )

  let textColor = 'black'
  if (closeToBlack(intColor)) {
    textColor = 'white'
  }
  ctx.fillStyle = textColor
  ctx.fillText(
    value,
    x * (CELL_SIZE + 1) + horizontalOffset,
    y * (CELL_SIZE + 1) + verticalOffset
  )
}

function renderPuzzleDesc (desc) {
  const height = desc.fullHeight
  const width = desc.fullWidth

  const canvas = <HTMLCanvasElement>document.querySelector('#nonoCanvas')
  canvas.height = (CELL_SIZE + 1) * height + 3
  canvas.width = (CELL_SIZE + 1) * width + 3

  const ctx = canvas.getContext('2d')
  const rowsNumber = desc.rows.length
  const colsNumber = desc.cols.length
  const rowsSideSize = width - colsNumber
  const colsHeaderSize = height - rowsNumber
  drawGrid(ctx, rowsSideSize, colsHeaderSize, width, height)

  ctx.beginPath()
  const fontSize = CELL_SIZE * 0.7
  ctx.font = fontSize + 'px Verdana'

  for (let i = 0; i < rowsNumber; i++) {
    const row = desc.rows[i]
    const rowColors = desc.rowsColors[i]

    const rowOffset = rowsSideSize - row.length
    const rowIndex = colsHeaderSize + i

    for (let j = 0; j < row.length; j++) {
      const colIndex = rowOffset + j
      renderBlock(ctx, row[j], rowColors[j], colIndex, rowIndex)
    }
  }

  for (let i = 0; i < colsNumber; i++) {
    const col = desc.cols[i]
    const colColors = desc.colsColors[i]

    const colOffset = colsHeaderSize - col.length
    const colIndex = rowsSideSize + i

    for (let j = 0; j < col.length; j++) {
      const rowIndex = colOffset + j
      renderBlock(ctx, col[j], colColors[j], colIndex, rowIndex)
    }
  }
  ctx.stroke()
}

function renderPuzzleCells (desc) {
  const height = desc.fullHeight
  const width = desc.fullWidth

  const rowsNumber = desc.rowsNumber
  const colsNumber = desc.colsNumber
  const rowsSideSize = width - colsNumber
  const colsHeaderSize = height - rowsNumber
  const cells = desc.cellsAsColors
  const whiteDotSize = CELL_SIZE / 10
  const whiteDotOffset = (CELL_SIZE - whiteDotSize) / 2
  const whiteColorCode = desc.whiteColorCode

  const canvas = <HTMLCanvasElement>document.querySelector('#nonoCanvas')
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  for (let i = 0; i < rowsNumber; i++) {
    const rowStartIndex = i * colsNumber
    const y = colsHeaderSize + i

    for (let j = 0; j < colsNumber; j++) {
      const index = rowStartIndex + j
      const intColor = cells[index]
      const x = rowsSideSize + j

      if (intColor >= 0) {
        const blockColor = '#' + intColor.toString(16).padStart(6, '0')
        ctx.fillStyle = blockColor
        ctx.fillRect(
          x * (CELL_SIZE + 1) + 1,
          y * (CELL_SIZE + 1) + 1,
          CELL_SIZE,
          CELL_SIZE
        )
      } else if (intColor === whiteColorCode) {
        ctx.fillStyle = 'black'
        // ctx.arc(
        //     x * (CELL_SIZE + 1) + 1 + CELL_SIZE / 2,
        //     y * (CELL_SIZE + 1) + 1  + CELL_SIZE / 2,
        //     whiteDotSize,
        //     0, 2 * Math.PI
        // );
        // ctx.fill();
        // ctx.closePath();
        ctx.fillRect(
          x * (CELL_SIZE + 1) + 1 + whiteDotOffset,
          y * (CELL_SIZE + 1) + 1 + whiteDotOffset,
          whiteDotSize,
          whiteDotSize
        )
      }
    }
  }
  ctx.stroke()
}

function drawGrid (ctx, xStart, yStart, width, height) {
  ctx.beginPath()
  ctx.strokeStyle = GRID_COLOR

  const lastX = width * (CELL_SIZE + 1) + 1
  const lastY = height * (CELL_SIZE + 1) + 1

  // Vertical lines.
  for (let i = xStart; i <= width; i++) {
    const currentX = i * (CELL_SIZE + 1) + 1
    ctx.moveTo(currentX, 0)
    ctx.lineTo(currentX, lastY)

    if ((i - xStart) % 5 === 0) {
      ctx.moveTo(currentX + 1, 0)
      ctx.lineTo(currentX + 1, lastY)
    }
  }

  // Horizontal lines.
  for (let j = yStart; j <= height; j++) {
    const currentY = j * (CELL_SIZE + 1) + 1
    ctx.moveTo(0, currentY)
    ctx.lineTo(lastX, currentY)

    if ((j - yStart) % 5 === 0) {
      ctx.moveTo(0, currentY + 1)
      ctx.lineTo(lastX, currentY + 1)
    }
  }

  ctx.stroke()
}

// ========================= HELPERS =========================
function searchParams () {
  return new URL(window.location.href).searchParams
}

function intValFromQuery (arg) {
  const parameters = searchParams()
  return parseInt(parameters.get(arg))
}
