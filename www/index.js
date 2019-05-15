import {webpbn_board, solve, WasmRenderer, white_color_code} from "nono";


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
            //console.log("data", data);
            const renderedBoard = webpbn_board(id, data);
            //const pre = document.getElementById("nonoCanvas");
            //pre.textContent = renderedBoard;
            renderPuzzleDesc(id);
            $("#solve").attr("disabled", false);
        },
        //headers: {"X-Requested-With": "foo"},
        dataType: 'html',
    });
    window.currentPuzzle = id;
}

const CELL_SIZE = 20; // px
const GRID_COLOR = "#CCCCCC";
const BLANK_COLOR = "#FFFFFF";
const BOX_COLOR = "#000000";
//const UNKNOWN_COLOR_CODE = unknown_color_code();

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

function renderPuzzleDesc(id) {
    const desc = WasmRenderer.from_board(id);

    const height = desc.full_height();
    const width = desc.full_width();

    const canvas = document.getElementById("nonoCanvas");
    canvas.height = (CELL_SIZE + 1) * height + 1;
    canvas.width = (CELL_SIZE + 1) * width + 1;

    const ctx = canvas.getContext('2d');
    const rows_number = desc.rows_number();
    const cols_number = desc.cols_number();
    const rows_side_size = width - cols_number;
    const cols_header_size = height - rows_number;
    drawGrid(ctx, rows_side_size, cols_header_size, width, height);

    ctx.beginPath();
    const fontSize = CELL_SIZE * 0.7;
    ctx.font = fontSize + "px Verdana";

    for (let i = 0; i < rows_number; i++) {
        const row = desc.get_row(i);
        const rowColors = desc.get_row_colors(i);

        const rowOffset = rows_side_size - row.length;
        const rowIndex = cols_header_size + i;

        for (let j = 0; j < row.length; j++) {
            const colIndex = rowOffset + j;
            renderBlock(ctx, row[j], rowColors[j], colIndex, rowIndex);
        }
    }

    for (let i = 0; i < cols_number; i++) {
        const col = desc.get_column(i);
        const colColors = desc.get_column_colors(i);

        const colOffset = cols_header_size - col.length;
        const colIndex = rows_side_size + i;

        for (let j = 0; j < col.length; j++) {
            const rowIndex = colOffset + j;
            renderBlock(ctx, col[j], colColors[j], colIndex, rowIndex);
        }
    }
    ctx.stroke();
}

function renderPuzzleCells(id) {
    const desc = WasmRenderer.from_board(id);
    const height = desc.full_height();
    const width = desc.full_width();
    const rows_number = desc.rows_number();
    const cols_number = desc.cols_number();
    const rows_side_size = width - cols_number;
    const cols_header_size = height - rows_number;
    const cells = desc.cells_as_colors();
    const whiteDotSize = CELL_SIZE / 10;
    const whiteDotOffset = (CELL_SIZE - whiteDotSize) / 2;
    const WHITE_COLOR_CODE = white_color_code();

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
            }
            else if (intColor == WHITE_COLOR_CODE) {
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
                    y * (CELL_SIZE + 1) + 1  + whiteDotOffset,
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

  // Vertical lines.
  for (let i = x_start; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = y_start; j <= height; j++) {
    ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
}

function solvePuzzle(id) {
    console.time("solve puzzle #" + id);
    const renderedBoard = solve(id);
    console.timeEnd("solve puzzle #" + id);

    renderPuzzleCells(id);
    //const pre = document.getElementById("nonoCanvas");
    //pre.textContent = renderedBoard;
}

function initPage() {
    setInputFilter(document.getElementById("puzzleId"), function(value) {
        return /^\d*$/.test(value) && (value === "" || parseInt(value) <= 40000); });

    submitEnterForInput(document.getElementById("puzzleId"), document.getElementById("get"));

    $("#get").on("click", function() {
        initPuzzle(parseInt($("#puzzleId").val()));
    });

    $("#solve").attr("disabled", true);
    $("#solve").on("click", function() {
        solvePuzzle(window.currentPuzzle);
    });

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
