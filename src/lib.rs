mod board;
mod utils;

use std::collections::HashMap;
use std::fmt::Display;
use std::sync::Mutex;

use board::WasmRenderer;

use nonogrid::{
    block::{base::Block, binary::BinaryBlock, multicolor::ColoredBlock},
    board::Board,
    parser::{BoardParser, DetectedParser, PuzzleScheme},
    //render::{Renderer, ShellRenderer},
    solver::{
        self,
        line::{DynamicColor, DynamicSolver},
        probing::FullProbe1,
    },
    utils::rc::MutRc,
};

use lazy_static::lazy_static;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

enum VarBoard {
    BlackAndWhite(MutRc<Board<BinaryBlock>>),
    MultiColor(MutRc<Board<ColoredBlock>>),
}

#[wasm_bindgen]
#[derive(Eq, PartialEq, Hash)]
pub enum Source {
    WebPbnCom,
    NonogramsOrg,
}

lazy_static! {
    static ref BOARDS: Mutex<HashMap<(Source, u16), VarBoard>> = Mutex::new(HashMap::new());
}

#[wasm_bindgen]
pub fn board_with_content(source: Source, id: u16, content: String) {
    utils::set_panic_hook();

    let id = (source, id);

    if BOARDS.lock().unwrap().contains_key(&id) {
        // the board already here
        return;
    }

    let parser = DetectedParser::with_content(content).unwrap();
    match parser.infer_scheme() {
        PuzzleScheme::MultiColor => {
            let board = parser.parse();
            let board = MutRc::new(board);

            BOARDS
                .lock()
                .unwrap()
                .insert(id, VarBoard::MultiColor(MutRc::clone(&board)));
            //ShellRenderer::with_board(board).render()
        }
        PuzzleScheme::BlackAndWhite => {
            let board = parser.parse();
            let board = MutRc::new(board);

            BOARDS
                .lock()
                .unwrap()
                .insert(id, VarBoard::BlackAndWhite(MutRc::clone(&board)));
            //ShellRenderer::with_board(board).render()
        }
    }

    //thread::spawn(move || solve(id, multi_color));
}

fn solve_and_render<B>(board: &MutRc<Board<B>>)
where
    B: Block + Display,
    B::Color: DynamicColor + Display,
{
    solver::run::<_, DynamicSolver<_>, FullProbe1<_>>(MutRc::clone(&board), Some(2), None, None)
        .unwrap();

    //ShellRenderer::with_board(MutRc::clone(&board)).render()
}

#[wasm_bindgen]
pub fn solve(source: Source, id: u16) {
    let board_wpapped = &BOARDS.lock().unwrap()[&(source, id)];
    match board_wpapped {
        VarBoard::BlackAndWhite(board) => solve_and_render(board),
        VarBoard::MultiColor(board) => solve_and_render(board),
    }
}

#[wasm_bindgen]
impl WasmRenderer {
    pub fn from_board(source: Source, id: u16) -> Self {
        let board_wrapped = &BOARDS.lock().unwrap()[&(source, id)];

        match board_wrapped {
            VarBoard::BlackAndWhite(ref board) => Self::with_binary_board(board),
            VarBoard::MultiColor(ref board) => Self::with_colored_board(board),
        }
    }
}
