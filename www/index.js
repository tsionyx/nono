var worker = new Worker('worker.js');

function workerCallback(e) {
  var data = e.data;

  console.log("Got response from worker: ", data);
  if (data.error) {
    console.error(data.error);
  }

  switch (data.result) {
    case 'initBoard':
      worker.postMessage({
        'cmd': 'renderDescriptions',
        'id': data.id
      });
      $("#solve").attr("disabled", false);
      break;

    case 'renderDescriptions':
      renderPuzzleDesc(data.obj);
      break;

    case 'renderCells':
      renderPuzzleCells(data.obj);
      break;

    case 'solvePuzzle':
      worker.postMessage({
        'cmd': 'renderCells',
        'id': data.id
      });
      break;

    default:
      console.error('Unknown response from worker: ', data.result);
  }
}


const CORS_PROXY = "https://cors-anywhere.herokuapp.com/"

function initPuzzle(id) {
  if (!id) {
    console.log("Bad puzzle id: ", id);
    return;
  }

  // const url = CORS_PROXY + "http://www.nonograms.org/nonograms/i/21251";
  const url = CORS_PROXY + "http://www.webpbn.com/XMLpuz.cgi?id=";
  $.get({
    url: url + id,
    success: function(data, status) {
      worker.postMessage({
        'cmd': 'initBoard',
        'id': id,
        'content': data
      });
    },
    //headers: {"X-Requested-With": "foo"},
    dataType: 'html',
  });
  window.currentPuzzle = id;
}

const CELL_SIZE = 20; // px
const GRID_COLOR = "#000000";
const BLANK_COLOR = "#FFFFFF";
const WHITE_COLOR_CODE = -1;

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
  if (blockColor === "#000000") {
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
      } else if (intColor == WHITE_COLOR_CODE) {
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



function initPage() {
  setInputFilter(document.getElementById("puzzleId"), function(value) {
    return /^\d*$/.test(value) && (value === "" || parseInt(value) <= 40000);
  });

  submitEnterForInput(document.getElementById("puzzleId"), document.getElementById("get"));

  $("#get").on("click", function() {
    initPuzzle(parseInt($("#puzzleId").val()));
  });

  $("#solve").attr("disabled", true);
  $("#solve").on("click", function() {
    worker.postMessage({
      'cmd': 'solvePuzzle',
      'id': window.currentPuzzle
    });
  });

  worker.addEventListener('message', workerCallback, false);

  const puzzleId = parseInt(document.location.search.split('id=')[1]);
  if (puzzleId) {
    //console.log(puzzleId);
    $("#puzzleId").val(puzzleId);
  }
  $("#get").trigger("click");
}

$(document).ready(function() {
  initPage();
});
