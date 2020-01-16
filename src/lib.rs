use std::collections::{hash_map::DefaultHasher, HashMap};
use std::fmt::Display;
use std::hash::{Hash, Hasher};
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

type HashInt = u32;

lazy_static! {
    static ref BOARDS: Mutex<HashMap<HashInt, VarBoard>> = Default::default();
}

fn boards() -> MutexGuard<'static, HashMap<HashInt, VarBoard>> {
    BOARDS.lock().expect("Cannot lock the boards mutex")
}

#[wasm_bindgen]
#[must_use]
pub fn init_board(content: String) -> HashInt {
    utils::set_panic_hook();

    let id = calculate_hash(&content);
    if boards().contains_key(&id) {
        // the board already here
        return id;
    }

    let parser = DetectedParser::with_content(content).expect("Parsing failed");
    let new_board = match parser.infer_scheme() {
        PuzzleScheme::MultiColor => {
            let mut board = parser.parse();
            board.reduce_colors();
            let board = MutRc::new(board);
            VarBoard::MultiColor(board)
        }
        PuzzleScheme::BlackAndWhite => {
            let board = MutRc::new(parser.parse());
            VarBoard::BlackAndWhite(board)
        }
    };
    boards().insert(id, new_board);
    id
}

#[wasm_bindgen]
pub fn solve(hash: HashInt, max_solutions: usize) {
    let board = &boards()[&hash];
    match board {
        VarBoard::BlackAndWhite(board) => solve_and_render(board, max_solutions),
        VarBoard::MultiColor(board) => solve_and_render(board, max_solutions),
    }
}

#[wasm_bindgen]
impl WasmRenderer {
    pub fn for_board(hash: HashInt) -> Self {
        let board = &boards()[&hash];
        match board {
            VarBoard::BlackAndWhite(board) => Self::with_black_and_white(board),
            VarBoard::MultiColor(board) => Self::with_colored(board),
        }
    }

    #[wasm_bindgen]
    #[allow(clippy::missing_const_for_fn)]
    pub fn white_color_code() -> i32 {
        board::WHITE_COLOR_CODE
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

    if let Some(solutions) = solutions {
        // force to find all solutions up to `max_solutions`
        let last_solution = solutions.last().expect("No solutions found");
        Board::restore_with_callback(MutRc::clone(board), last_solution);
    }
}

fn calculate_hash<T: Hash>(t: &T) -> HashInt {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish() as HashInt
}
