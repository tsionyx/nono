document.addEventListener("DOMContentLoaded", function(event) {
  initPage();
});

var worker = new Worker('worker.js');
worker.addEventListener('message', workerCallback, false);

function initPage() {
  const $webpbnCounter = document.querySelector("#webpbnCounter");
  const $nonogramsOrgCounter = document.querySelector("#nonogramsOrgCounter");
  const $nonoSrcInput = document.querySelector("#nonoSrc");
  const $solveButton = document.querySelector("#solve");

  setKeyHandlerForLoading($webpbnCounter);
  setKeyHandlerForLoading($nonogramsOrgCounter);

  $nonoSrcInput.value = "";
  initFromArgs();

  $solveButton.addEventListener("click", function(event) {
    worker.postMessage({
      'cmd': 'initBoard',
      'content': $nonoSrcInput.value
    });
  });

  document.querySelector("#share").addEventListener("click", function(event) {
    const content = $nonoSrcInput.value;
    if (content) {
      const encoded = encodeURIComponent(content);
      history.pushState(null, document.title, '?s=' + encoded);
    }
  });

  document.querySelector("#webpbnButton").addEventListener("click", function(event) {
    loadPuzzle(WEBPBN_SOURCE_URL, parseInt($webpbnCounter.valueAsNumber));
  });

  document.querySelector("#nonogramsOrgButton").addEventListener("click", function(event) {
    loadPuzzle(NONOGRAMS_SOURCE_URL, parseInt($nonogramsOrgCounter.valueAsNumber));
  });

  document.querySelector('body').addEventListener("keydown", function(event) {
    if (event.ctrlKey && event.keyCode === 13) {
      $solveButton.click();
    }
  });
}

function setKeyHandlerForLoading(input) {
  input.addEventListener("keypress", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 || event.which === 13) {
      // Cancel the default action, if needed
      event.preventDefault();

      const counter = event.target;
      const value = counter.valueAsNumber;
      if (value) {
        const sourceUrl = counter.name;
        loadPuzzle(sourceUrl, parseInt(value));
      }
    }
  });
}

function initFromArgs() {
  const parameters = new URL(window.location).searchParams;

  const content = parameters.get('s');
  if (content) {
    document.querySelector("#nonoSrc").value = content;
  } else {
    const webPbnId = parseInt(parameters.get('id'));
    const nonogramsOrgId = parseInt(parameters.get('noid'));
    if (webPbnId) {
      console.log("Loading webpbn.com from query: " + webPbnId);
      document.querySelector("#webpbnCounter").value = webPbnId;
      loadPuzzle(WEBPBN_SOURCE_URL, webPbnId);
    } else if (nonogramsOrgId) {
      console.log("Loading nonograms.org from query: " + nonogramsOrgId);
      document.querySelector("#nonogramsOrgCounter").value = nonogramsOrgId;
      loadPuzzle(NONOGRAMS_SOURCE_URL, nonogramsOrgId);
    }
  }
}

function workerCallback(e) {
  var data = e.data;

  console.log("Got response from worker: ", data);
  if (data.error) {
    console.error(data.error);
  }

  const hash = data.hash;

  switch (data.result) {
    case 'initBoard':
      worker.postMessage({
        'cmd': 'renderDescriptions',
        'hash': hash,
      });

      let solveMsg = {
        'cmd': 'solvePuzzle',
        'hash': hash,
      };
      const maxSolutions = intValFromQuery('solutions');
      if (!isNaN(maxSolutions)) {
        solveMsg.maxSolutions = maxSolutions;
      }
      worker.postMessage(solveMsg);
      document.querySelector("#timeToSolve").innerHTML = "Solving puzzle with hash " + hash + "...";
      break;

    case 'renderDescriptions':
      renderPuzzleDesc(data.obj);
      break;

    case 'renderCells':
      renderPuzzleCells(data.obj);
      break;

    case 'solvePuzzle':
      const msg = "Time to solve the puzzle with hash " + hash + ": " + +data.time.toFixed(2) + "ms";
      document.querySelector("#timeToSolve").innerHTML = msg;
      worker.postMessage({
        'cmd': 'renderCells',
        'hash': hash,
      });
      break;

    default:
      console.error('Unknown response from worker: ', data.result);
  }
}

// ========================= HTTP =========================
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/"
const WEBPBN_SOURCE_URL = "https://webpbn.com";
const NONOGRAMS_SOURCE_URL = "http://nonograms.org";

let sourceUrlToPuzzleUrl = new Object;
sourceUrlToPuzzleUrl[WEBPBN_SOURCE_URL] = WEBPBN_SOURCE_URL + "/export.cgi";
sourceUrlToPuzzleUrl[NONOGRAMS_SOURCE_URL] = NONOGRAMS_SOURCE_URL + "/nonograms2/i/";

const NONOGRAMS_ENCODED_SRC_RE = /var d=(\[[\[\]\d, ]+\]);/gm;

function successCallback(sourceUrl, puzzleUrl) {
  return function(xhttp) {
    var data = xhttp.responseText;
    let src = data;
    if (sourceUrl == NONOGRAMS_SOURCE_URL) {
      while ((match = NONOGRAMS_ENCODED_SRC_RE.exec(data)) !== null) {
        src = match[0];
      }
    }
    document.querySelector("#nonoSrc").value = src;
    document.querySelector("#originalUrl").innerHTML = "<a href=" + puzzleUrl + ">Original puzzle URL</a>";
    //clearCanvas();
  };
}

function failCallback(msg) {
  return function(xhttp) {
    document.querySelector("#originalUrl").innerHTML = "Failed to get " + msg + ".";
    console.error(xhttp);
  };
}

function doGet(url, callback, error_callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (Math.floor(this.status / 100) == 2) {
        callback(this);
      } else {
        error_callback(this);
      }
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send(null);
}

function doPost(url, body, callback, error_callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (Math.floor(this.status / 100) == 2) {
        callback(this);
      } else {
        error_callback(this);
      }
    }
  };
  xhttp.open("POST", url, true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhttp.send(body);
}

function loadPuzzle(sourceUrl, id) {
  if (!id) {
    console.log("Bad puzzle id: ", id);
    return;
  }

  const msg = "puzzle #" + id + " from " + sourceUrl;
  document.querySelector("#originalUrl").innerHTML = "Retrieving " + msg + "...";
  let url = sourceUrlToPuzzleUrl[sourceUrl];

  let puzzleUrl;
  if (sourceUrl == WEBPBN_SOURCE_URL) {
    puzzleUrl = sourceUrl + "/?id=" + id;
    doPost(CORS_PROXY + url,
      'fmt=olsak&go=1&id=' + id,
      successCallback(sourceUrl, puzzleUrl),
      failCallback(msg));
  } else {
    url = url + id;
    puzzleUrl = url;
    doGet(CORS_PROXY + url,
      successCallback(sourceUrl, puzzleUrl),
      function(xhttp) {
        if (xhttp.status == 404) {
          const fixedUrl = url.replace("nonograms2", "nonograms");
          console.log("Try to find the puzzle #" + id + " on another URL: " + fixedUrl);
          doGet(CORS_PROXY + fixedUrl,
            successCallback(sourceUrl, fixedUrl),
            failCallback(msg));
        } else {
          failCallback(msg)(xhttp);
        }
      });
  }
}

// ========================= RENDERING =========================
const CELL_SIZE = 20; // px
const GRID_COLOR = "#000000";
const BLANK_COLOR = "#FFFFFF";

const ALMOST_ZERO = 5;

function closeToBlack(intColor) {
  let r = intColor >> 16;
  let gb = intColor % (1 << 16);
  let g = gb >> 8;
  let b = gb % (1 << 8);

  return ((r <= ALMOST_ZERO) && (g <= ALMOST_ZERO) && (b <= ALMOST_ZERO));
}

function renderBlock(ctx, value, intColor, x, y) {
  const verticalOffset = CELL_SIZE * 0.8;
  const horizontalOffset = CELL_SIZE * 0.15;

  let blockColor = '#' + intColor.toString(16).padStart(6, '0');
  if (blockColor === "#ffffff") {
    // for more visual attention
    blockColor = "#cccccc";
  }
  ctx.fillStyle = blockColor;
  ctx.fillRect(
    x * (CELL_SIZE + 1) + 1,
    y * (CELL_SIZE + 1) + 1,
    CELL_SIZE,
    CELL_SIZE
  );

  let textColor = "black";
  if (closeToBlack(intColor)) {
    textColor = "white";
  }
  ctx.fillStyle = textColor;
  ctx.fillText(
    value,
    x * (CELL_SIZE + 1) + horizontalOffset,
    y * (CELL_SIZE + 1) + verticalOffset,
  );
}

function renderPuzzleDesc(desc) {
  const height = desc.full_height;
  const width = desc.full_width;

  const canvas = document.querySelector("#nonoCanvas");
  canvas.height = (CELL_SIZE + 1) * height + 3;
  canvas.width = (CELL_SIZE + 1) * width + 3;

  const ctx = canvas.getContext('2d');
  const rows_number = desc.rows.length;
  const cols_number = desc.cols.length;
  const rows_side_size = width - cols_number;
  const cols_header_size = height - rows_number;
  drawGrid(ctx, rows_side_size, cols_header_size, width, height);

  ctx.beginPath();
  const fontSize = CELL_SIZE * 0.7;
  ctx.font = fontSize + "px Verdana";

  for (let i = 0; i < rows_number; i++) {
    const row = desc.rows[i];
    const rowColors = desc.rowsColors[i];

    const rowOffset = rows_side_size - row.length;
    const rowIndex = cols_header_size + i;

    for (let j = 0; j < row.length; j++) {
      const colIndex = rowOffset + j;
      renderBlock(ctx, row[j], rowColors[j], colIndex, rowIndex);
    }
  }

  for (let i = 0; i < cols_number; i++) {
    const col = desc.cols[i];
    const colColors = desc.colsColors[i];

    const colOffset = cols_header_size - col.length;
    const colIndex = rows_side_size + i;

    for (let j = 0; j < col.length; j++) {
      const rowIndex = colOffset + j;
      renderBlock(ctx, col[j], colColors[j], colIndex, rowIndex);
    }
  }
  ctx.stroke();
}

function renderPuzzleCells(desc) {
  const height = desc.full_height;
  const width = desc.full_width;

  const rows_number = desc.rows_number;
  const cols_number = desc.cols_number;
  const rows_side_size = width - cols_number;
  const cols_header_size = height - rows_number;
  const cells = desc.cells_as_colors;
  const whiteDotSize = CELL_SIZE / 10;
  const whiteDotOffset = (CELL_SIZE - whiteDotSize) / 2;
  const white_color_code = desc.white_color_code;

  const canvas = document.querySelector("#nonoCanvas");
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  for (let i = 0; i < rows_number; i++) {
    const rowStartIndex = i * cols_number;
    const y = cols_header_size + i;

    for (let j = 0; j < cols_number; j++) {
      const index = rowStartIndex + j;
      const intColor = cells[index];
      const x = rows_side_size + j;

      if (intColor >= 0) {
        let blockColor = '#' + intColor.toString(16).padStart(6, '0');
        ctx.fillStyle = blockColor;
        ctx.fillRect(
          x * (CELL_SIZE + 1) + 1,
          y * (CELL_SIZE + 1) + 1,
          CELL_SIZE,
          CELL_SIZE
        );
      } else if (intColor == white_color_code) {
        ctx.fillStyle = "black";
        // ctx.arc(
        //     x * (CELL_SIZE + 1) + 1 + CELL_SIZE / 2,
        //     y * (CELL_SIZE + 1) + 1  + CELL_SIZE / 2,
        //     whiteDotSize,
        //     0, 2 * Math.PI
        // );
        // ctx.fill();
        //ctx.closePath();
        ctx.fillRect(
          x * (CELL_SIZE + 1) + 1 + whiteDotOffset,
          y * (CELL_SIZE + 1) + 1 + whiteDotOffset,
          whiteDotSize,
          whiteDotSize,
        );
      }
    }
  }
  ctx.stroke();
}

function drawGrid(ctx, x_start, y_start, width, height) {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  const lastX = width * (CELL_SIZE + 1) + 1
  const lastY = height * (CELL_SIZE + 1) + 1;

  // Vertical lines.
  for (let i = x_start; i <= width; i++) {
    const currentX = i * (CELL_SIZE + 1) + 1;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, lastY);

    if ((i - x_start) % 5 == 0) {
      ctx.moveTo(currentX + 1, 0);
      ctx.lineTo(currentX + 1, lastY);
    }
  }

  // Horizontal lines.
  for (let j = y_start; j <= height; j++) {
    const currentY = j * (CELL_SIZE + 1) + 1;
    ctx.moveTo(0, currentY);
    ctx.lineTo(lastX, currentY);

    if ((j - y_start) % 5 == 0) {
      ctx.moveTo(0, currentY + 1);
      ctx.lineTo(lastX, currentY + 1);
    }
  }

  ctx.stroke();
}

function clearCanvas() {
  const canvas = document.querySelector("#nonoCanvas");
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// ========================= HELPERS =========================
function intValFromQuery(arg) {
  const parameters = new URL(window.location).searchParams;
  return parseInt(parameters.get(arg));
}
