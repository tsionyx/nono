import {webpbn_board, solve} from "nono";

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
    // const url = CORS_PROXY + "http://www.nonograms.org/nonograms/i/21251";
    const url = CORS_PROXY + "http://www.webpbn.com/XMLpuz.cgi?id=";
    $.get({
        url: url + id,
        success: function(data, status) {
            //console.log("data", data);
            const renderedBoard = webpbn_board(id, data);

            const pre = document.getElementById("nonoCanvas");
            pre.textContent = renderedBoard;
        },
        dataType: 'html',
    });
    window.currentPuzzle = id;
}

function solvePuzzle(id) {
    console.time("solve puzzle #" + id);
    const renderedBoard = solve(id);
    console.timeEnd("solve puzzle #" + id);

    const pre = document.getElementById("nonoCanvas");
    pre.textContent = renderedBoard;
}

$(document).ready(function() {
    setInputFilter(document.getElementById("puzzleId"), function(value) {
        return /^\d*$/.test(value) && (value === "" || parseInt(value) <= 40000); });

    submitEnterForInput(document.getElementById("puzzleId"), document.getElementById("get"));

    $("#get").on("click", function() {
        initPuzzle(parseInt($("#puzzleId").val()));
    });

    $("#solve").on("click", function() {
        solvePuzzle(window.currentPuzzle);
    });
});
