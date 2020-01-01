use std::collections::HashMap;
use std::fmt::Display;
use std::sync::{Mutex, MutexGuard};

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
    static ref BOARDS: Mutex<HashMap<(Source, u16), VarBoard>> = Default::default();
}

fn boards() -> MutexGuard<'static, HashMap<(Source, u16), VarBoard>> {
    BOARDS.lock().expect("Cannot lock the boards mutex")
}

#[wasm_bindgen]
pub fn init_board(source: Source, id: u16, content: String) {
    utils::set_panic_hook();

    let id = (source, id);

    if boards().contains_key(&id) {
        // the board already here
        return;
    }

    let parser = DetectedParser::with_content(content).expect("Parsing failed");
    let new_board = match parser.infer_scheme() {
        PuzzleScheme::MultiColor => {
            let board = MutRc::new(parser.parse());
            VarBoard::MultiColor(board)
        }
        PuzzleScheme::BlackAndWhite => {
            let board = MutRc::new(parser.parse());
            VarBoard::BlackAndWhite(board)
        }
    };
    boards().insert(id, new_board);
}

#[wasm_bindgen]
pub fn solve(source: Source, id: u16, max_solutions: usize) {
    let board = &boards()[&(source, id)];
    match board {
        VarBoard::BlackAndWhite(board) => solve_and_render(board, max_solutions),
        VarBoard::MultiColor(board) => solve_and_render(board, max_solutions),
    }
}

#[wasm_bindgen]
impl WasmRenderer {
    pub fn for_board(source: Source, id: u16) -> Self {
        let board = &boards()[&(source, id)];
        match board {
            VarBoard::BlackAndWhite(board) => Self::with_black_and_white(board),
            VarBoard::MultiColor(board) => Self::with_colored(board),
        }
    }
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
        let first_solution = solutions.next().expect("No solutions found");
        Board::restore_with_callback(MutRc::clone(board), first_solution);
    }
}
