var worker = new Worker('worker.js');
worker.addEventListener('message', workerCallback, false);
document.addEventListener("DOMContentLoaded", function (event) {
    initPage();
    console.log("It is TypeScript working here!");
});
function initPage() {
    var $webpbnCounter = document.querySelector("#webpbnCounter");
    var $nonogramsOrgCounter = document.querySelector("#nonogramsOrgCounter");
    var $nonoSrcInput = document.querySelector("#nonoSrc");
    var $solveButton = document.querySelector("#solve");
    setKeyHandlerForLoading($webpbnCounter);
    setKeyHandlerForLoading($nonogramsOrgCounter);
    $nonoSrcInput.value = "";
    initFromArgs();
    $solveButton.addEventListener("click", function (event) {
        worker.postMessage({
            'cmd': 'initBoard',
            'content': $nonoSrcInput.value
        });
    });
    document.querySelector("#share").addEventListener("click", function (event) {
        var content = $nonoSrcInput.value;
        if (content) {
            var encoded = encodeURIComponent(content);
            history.pushState(null, document.title, '?s=' + encoded);
        }
    });
    document.querySelector("#webpbnButton").addEventListener("click", function (event) {
        loadPuzzle(WEBPBN_SOURCE_URL, $webpbnCounter.valueAsNumber);
    });
    document.querySelector("#nonogramsOrgButton").addEventListener("click", function (event) {
        loadPuzzle(NONOGRAMS_SOURCE_URL, $nonogramsOrgCounter.valueAsNumber);
    });
    document.querySelector('body').addEventListener("keydown", function (event) {
        if (event.ctrlKey && event.keyCode === 13) {
            $solveButton.click();
        }
    });
}
function setKeyHandlerForLoading(input) {
    input.addEventListener("keypress", function (event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13 || event.which === 13) {
            // Cancel the default action, if needed
            event.preventDefault();
            var counter = event.target;
            var value = counter.valueAsNumber;
            if (value) {
                var sourceUrl = counter.name;
                loadPuzzle(sourceUrl, parseInt(value));
            }
        }
    });
}
function initFromArgs() {
    var parameters = searchParams();
    var content = parameters.get('s');
    if (content) {
        document.querySelector("#nonoSrc").value = content;
    }
    else {
        var webPbnId = parseInt(parameters.get('id'));
        var nonogramsOrgId = parseInt(parameters.get('noid'));
        if (webPbnId) {
            console.log("Loading webpbn.com from query: " + webPbnId);
            document.querySelector("#webpbnCounter").value = webPbnId.toString();
            loadPuzzle(WEBPBN_SOURCE_URL, webPbnId);
        }
        else if (nonogramsOrgId) {
            console.log("Loading nonograms.org from query: " + nonogramsOrgId);
            document.querySelector("#nonogramsOrgCounter").value = nonogramsOrgId.toString();
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
    var hash = data.hash;
    switch (data.result) {
        case 'init':
            break;
        case 'initBoard':
            worker.postMessage({
                'cmd': 'renderDescriptions',
                'hash': hash
            });
            var solveMsg = {
                'cmd': 'solvePuzzle',
                'hash': hash
            };
            var maxSolutions = intValFromQuery('solutions');
            if (!isNaN(maxSolutions)) {
                solveMsg["maxSolutions"] = maxSolutions;
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
            var timeMs = +data.time.toFixed(2);
            var timeAsStr = timeMs + "ms";
            if (timeMs > 1000) {
                timeAsStr = (timeMs / 1000.0).toFixed(3) + " seconds";
            }
            var msg = "Time to solve the puzzle with hash " + hash + ": " + timeAsStr;
            document.querySelector("#timeToSolve").innerHTML = msg;
            worker.postMessage({
                'cmd': 'renderCells',
                'hash': hash
            });
            break;
        default:
            console.error('Unknown response from worker: ', data.result);
    }
}
// ========================= HTTP =========================
var CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
var WEBPBN_SOURCE_URL = "https://webpbn.com";
var NONOGRAMS_SOURCE_URL = "http://nonograms.org";
var sourceUrlToPuzzleUrl = new Object;
sourceUrlToPuzzleUrl[WEBPBN_SOURCE_URL] = WEBPBN_SOURCE_URL + "/export.cgi";
sourceUrlToPuzzleUrl[NONOGRAMS_SOURCE_URL] = NONOGRAMS_SOURCE_URL + "/nonograms2/i/";
var NONOGRAMS_ENCODED_SRC_RE = /var d=(\[[\[\]\d, ]+\]);/gm;
function successCallback(sourceUrl, puzzleUrl) {
    return function (xhttp) {
        var data = xhttp.responseText;
        var src = data;
        if (sourceUrl == NONOGRAMS_SOURCE_URL) {
            var match = null;
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
    return function (xhttp) {
        document.querySelector("#originalUrl").innerHTML = "Failed to get " + msg + ".";
        console.error(xhttp);
    };
}
function doGet(url, callback, error_callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (Math.floor(this.status / 100) == 2) {
                callback(this);
            }
            else {
                error_callback(this);
            }
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send(null);
}
function doPost(url, body, callback, error_callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (Math.floor(this.status / 100) == 2) {
                callback(this);
            }
            else {
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
    var msg = "puzzle #" + id + " from " + sourceUrl;
    document.querySelector("#originalUrl").innerHTML = "Retrieving " + msg + "...";
    var url = sourceUrlToPuzzleUrl[sourceUrl];
    var puzzleUrl;
    if (sourceUrl == WEBPBN_SOURCE_URL) {
        puzzleUrl = sourceUrl + "/?id=" + id;
        doPost(CORS_PROXY + url, 'fmt=olsak&go=1&id=' + id, successCallback(sourceUrl, puzzleUrl), failCallback(msg));
    }
    else {
        url = url + id;
        puzzleUrl = url;
        doGet(CORS_PROXY + url, successCallback(sourceUrl, puzzleUrl), function (xhttp) {
            if (xhttp.status == 404) {
                var fixedUrl = url.replace("nonograms2", "nonograms");
                console.log("Try to find the puzzle #" + id + " on another URL: " + fixedUrl);
                doGet(CORS_PROXY + fixedUrl, successCallback(sourceUrl, fixedUrl), failCallback(msg));
            }
            else {
                failCallback(msg)(xhttp);
            }
        });
    }
}
// ========================= RENDERING =========================
var CELL_SIZE = 20; // px
var GRID_COLOR = "#000000";
var BLANK_COLOR = "#FFFFFF";
var ALMOST_ZERO = 5;
function closeToBlack(intColor) {
    var r = intColor >> 16;
    var gb = intColor % (1 << 16);
    var g = gb >> 8;
    var b = gb % (1 << 8);
    return ((r <= ALMOST_ZERO) && (g <= ALMOST_ZERO) && (b <= ALMOST_ZERO));
}
function renderBlock(ctx, value, intColor, x, y) {
    var verticalOffset = CELL_SIZE * 0.8;
    var horizontalOffset = CELL_SIZE * 0.15;
    var blockColor = '#' + intColor.toString(16).padStart(6, '0');
    if (blockColor === "#ffffff") {
        // for more visual attention
        blockColor = "#cccccc";
    }
    ctx.fillStyle = blockColor;
    ctx.fillRect(x * (CELL_SIZE + 1) + 1, y * (CELL_SIZE + 1) + 1, CELL_SIZE, CELL_SIZE);
    var textColor = "black";
    if (closeToBlack(intColor)) {
        textColor = "white";
    }
    ctx.fillStyle = textColor;
    ctx.fillText(value, x * (CELL_SIZE + 1) + horizontalOffset, y * (CELL_SIZE + 1) + verticalOffset);
}
function renderPuzzleDesc(desc) {
    var height = desc.full_height;
    var width = desc.full_width;
    var canvas = document.querySelector("#nonoCanvas");
    canvas.height = (CELL_SIZE + 1) * height + 3;
    canvas.width = (CELL_SIZE + 1) * width + 3;
    var ctx = canvas.getContext('2d');
    var rows_number = desc.rows.length;
    var cols_number = desc.cols.length;
    var rows_side_size = width - cols_number;
    var cols_header_size = height - rows_number;
    drawGrid(ctx, rows_side_size, cols_header_size, width, height);
    ctx.beginPath();
    var fontSize = CELL_SIZE * 0.7;
    ctx.font = fontSize + "px Verdana";
    for (var i = 0; i < rows_number; i++) {
        var row = desc.rows[i];
        var rowColors = desc.rowsColors[i];
        var rowOffset = rows_side_size - row.length;
        var rowIndex = cols_header_size + i;
        for (var j = 0; j < row.length; j++) {
            var colIndex = rowOffset + j;
            renderBlock(ctx, row[j], rowColors[j], colIndex, rowIndex);
        }
    }
    for (var i = 0; i < cols_number; i++) {
        var col = desc.cols[i];
        var colColors = desc.colsColors[i];
        var colOffset = cols_header_size - col.length;
        var colIndex = rows_side_size + i;
        for (var j = 0; j < col.length; j++) {
            var rowIndex = colOffset + j;
            renderBlock(ctx, col[j], colColors[j], colIndex, rowIndex);
        }
    }
    ctx.stroke();
}
function renderPuzzleCells(desc) {
    var height = desc.full_height;
    var width = desc.full_width;
    var rows_number = desc.rows_number;
    var cols_number = desc.cols_number;
    var rows_side_size = width - cols_number;
    var cols_header_size = height - rows_number;
    var cells = desc.cells_as_colors;
    var whiteDotSize = CELL_SIZE / 10;
    var whiteDotOffset = (CELL_SIZE - whiteDotSize) / 2;
    var white_color_code = desc.white_color_code;
    var canvas = document.querySelector("#nonoCanvas");
    var ctx = canvas.getContext('2d');
    ctx.beginPath();
    for (var i = 0; i < rows_number; i++) {
        var rowStartIndex = i * cols_number;
        var y = cols_header_size + i;
        for (var j = 0; j < cols_number; j++) {
            var index = rowStartIndex + j;
            var intColor = cells[index];
            var x = rows_side_size + j;
            if (intColor >= 0) {
                var blockColor = '#' + intColor.toString(16).padStart(6, '0');
                ctx.fillStyle = blockColor;
                ctx.fillRect(x * (CELL_SIZE + 1) + 1, y * (CELL_SIZE + 1) + 1, CELL_SIZE, CELL_SIZE);
            }
            else if (intColor == white_color_code) {
                ctx.fillStyle = "black";
                // ctx.arc(
                //     x * (CELL_SIZE + 1) + 1 + CELL_SIZE / 2,
                //     y * (CELL_SIZE + 1) + 1  + CELL_SIZE / 2,
                //     whiteDotSize,
                //     0, 2 * Math.PI
                // );
                // ctx.fill();
                //ctx.closePath();
                ctx.fillRect(x * (CELL_SIZE + 1) + 1 + whiteDotOffset, y * (CELL_SIZE + 1) + 1 + whiteDotOffset, whiteDotSize, whiteDotSize);
            }
        }
    }
    ctx.stroke();
}
function drawGrid(ctx, x_start, y_start, width, height) {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    var lastX = width * (CELL_SIZE + 1) + 1;
    var lastY = height * (CELL_SIZE + 1) + 1;
    // Vertical lines.
    for (var i = x_start; i <= width; i++) {
        var currentX = i * (CELL_SIZE + 1) + 1;
        ctx.moveTo(currentX, 0);
        ctx.lineTo(currentX, lastY);
        if ((i - x_start) % 5 == 0) {
            ctx.moveTo(currentX + 1, 0);
            ctx.lineTo(currentX + 1, lastY);
        }
    }
    // Horizontal lines.
    for (var j = y_start; j <= height; j++) {
        var currentY = j * (CELL_SIZE + 1) + 1;
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
    var canvas = document.querySelector("#nonoCanvas");
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
}
// ========================= HELPERS =========================
function searchParams() {
    return new URL(window.location.href).searchParams;
}
function intValFromQuery(arg) {
    var parameters = searchParams();
    return parseInt(parameters.get(arg));
}
