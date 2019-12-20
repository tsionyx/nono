use std::collections::HashMap;
use std::fmt::Display;
use std::sync::Mutex;

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
use wasm_bindgen::prelude::*;

use board::WasmRenderer;
use lazy_static::lazy_static;

mod board;
mod utils;

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

fn solve_and_render<B>(board: &MutRc<Board<B>>, max_solutions: usize)
where
    B: Block + Display,
    B::Color: DynamicColor + Display,
{
    let solutions =
        solver::run::<_, DynamicSolver<_>, FullProbe1<_>>(MutRc::clone(board), Some(max_solutions))
            .unwrap();

    if let Some(mut solutions) = solutions {
        let first_solution = solutions.next().unwrap();
        Board::restore_with_callback(MutRc::clone(board), first_solution);
    }
}

#[wasm_bindgen]
pub fn solve(source: Source, id: u16, max_solutions: usize) {
    let board_wrapped = &BOARDS.lock().unwrap()[&(source, id)];
    match board_wrapped {
        VarBoard::BlackAndWhite(board) => solve_and_render(board, max_solutions),
        VarBoard::MultiColor(board) => solve_and_render(board, max_solutions),
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
