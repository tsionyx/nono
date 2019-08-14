var worker = new Worker('worker.js');

function workerCallback(e) {
  var data = e.data;

  console.log("Got response from worker: ", data);
  if (data.error) {
    console.error(data.error);
  }

  const id = data.id;
  const source = data.source;

  switch (data.result) {
    case 'initBoard':
      worker.postMessage({
        'cmd': 'renderDescriptions',
        'source': source,
        'id': id,
      });

      let solveMsg = {
        'cmd': 'solvePuzzle',
        'source': source,
        'id': id,
      };
      const maxSolutions = intValFromQuery('solutions');
      if (maxSolutions !== undefined) {
        solveMsg.maxSolutions = maxSolutions;
      }
      worker.postMessage(solveMsg);
      document.getElementById("timeToSolve").innerHTML = "Solving puzzle #" + id + " from " + source + "...";
      document.getElementById("originalUrl").innerHTML = "<a href=" + data.url + ">Original puzzle URL</a>";
      break;

    case 'renderDescriptions':
      renderPuzzleDesc(data.obj);
      break;

    case 'renderCells':
      renderPuzzleCells(data.obj);
      break;

    case 'solvePuzzle':
      const msg = "Time to solve the puzzle #" + id + " from " + source + ": " + +data.time.toFixed(2) + "ms";
      document.getElementById("timeToSolve").innerHTML = msg;
      worker.postMessage({
        'cmd': 'renderCells',
        'source': source,
        'id': id,
      });
      break;

    default:
      console.error('Unknown response from worker: ', data.result);
  }
}


const CORS_PROXY = "https://cors-anywhere.herokuapp.com/"
const WEBPBN_SOURCE_URL = "https://webpbn.com";
const NONOGRAMS_SOURCE_URL = "http://nonograms.org";

let sourceUrlToPuzzleUrl = new Object;
sourceUrlToPuzzleUrl[WEBPBN_SOURCE_URL] = WEBPBN_SOURCE_URL + "/export.cgi";
sourceUrlToPuzzleUrl[NONOGRAMS_SOURCE_URL] = NONOGRAMS_SOURCE_URL + "/nonograms2/i/";

function successCallback(sourceUrl, id, puzzleUrl) {
  let workerPayload = {
    'cmd': 'initBoard',
    'source': sourceUrl,
    'id': id,
  };

  return function(xhttp) {
    var data = xhttp.responseText;
    workerPayload.content = data;
    workerPayload.url = puzzleUrl;
    worker.postMessage(workerPayload);
  };
}

function initPuzzle(sourceUrl, id) {
  if (!id) {
    console.log("Bad puzzle id: ", id);
    return;
  }

  document.getElementById("timeToSolve").innerHTML = "Retreiving puzzle #" + id + " from " + sourceUrl + "...";
  let url = sourceUrlToPuzzleUrl[sourceUrl];

  let puzzleUrl;
  if (sourceUrl == WEBPBN_SOURCE_URL) {
    puzzleUrl = sourceUrl + "/" + id;
    doPost(CORS_PROXY + url,
      'fmt=olsak&go=1&id=' + id,
      successCallback(sourceUrl, id, puzzleUrl));
  } else {
    url = url + id;
    puzzleUrl = url;
    doGet(CORS_PROXY + url,
      successCallback(sourceUrl, id, puzzleUrl),
      function(xhttp) {
        if (xhttp.status == 404) {
          const fixedUrl = url.replace("nonograms2", "nonograms");
          console.log("Try to find the puzzle #" + id + " on another URL: " + fixedUrl);
          doGet(CORS_PROXY + fixedUrl,
            successCallback(sourceUrl, id, fixedUrl));
        }
      });
  }
}

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
  //console.log(colIndex, rowIndex);
  ctx.fillText(
    value,
    x * (CELL_SIZE + 1) + horizontalOffset,
    y * (CELL_SIZE + 1) + verticalOffset,
  );
}

function renderPuzzleDesc(desc) {
  const height = desc.full_height;
  const width = desc.full_width;

  const canvas = document.getElementById("nonoCanvas");
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

  const canvas = document.getElementById("nonoCanvas");
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

// https://jsfiddle.net/emkey08/zgvtjc51
// Restricts input for the given textbox to the given inputFilter.
function setInputFilter(textbox, inputFilter) {
  ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function(event) {
    textbox.addEventListener(event, function() {
      if (inputFilter(this.value)) {
        this.oldValue = this.value;
        this.oldSelectionStart = this.selectionStart;
        this.oldSelectionEnd = this.selectionEnd;
      } else if (this.hasOwnProperty("oldValue")) {
        this.value = this.oldValue;
        this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
      }
    });
  });
}


function submitEnterForInput(textbox, button) {
  textbox.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      button.click();
    }
  });
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

function intValFromQuery(arg) {
  const val = document.location.search.split(arg + '=');
  if (val.length < 2) {
    return undefined;
  }
  return parseInt(val[1]);
}

function initPage() {
  setInputFilter(document.getElementById("puzzleId"), function(value) {
    return /^\d*$/.test(value) && (value === "" || parseInt(value) <= 40000);
  });

  submitEnterForInput(document.getElementById("puzzleId"), document.getElementById("get"));

  document.getElementById("get").addEventListener("click", function() {
    const sourceUrl = document.querySelector('input[name=source]:checked').value;
    const puzzleId = document.getElementById("puzzleId").value;
    initPuzzle(sourceUrl, parseInt(puzzleId));
  });

  worker.addEventListener('message', workerCallback, false);

  const puzzleId = intValFromQuery('id');
  if (puzzleId) {
    //console.log(puzzleId);
    document.getElementById("puzzleId").value = puzzleId;
  }
  document.getElementById("get").click();
}

document.addEventListener("DOMContentLoaded", function(event) {
  initPage();
});
