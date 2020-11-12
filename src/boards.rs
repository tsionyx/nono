use std::{
    collections::{hash_map::DefaultHasher, HashMap},
    fmt::Display,
    hash::{Hash, Hasher},
    sync::{Mutex, MutexGuard},
};

use lazy_static::lazy_static;
use nonogrid::{
    parser::PuzzleScheme, solve as solve_nonogram, BinaryBlock, Block, Board, BoardParser,
    ColoredBlock, DetectedParser, DynamicColor, FullProbe, LineSolver, RcBoard,
};
use wasm_bindgen::prelude::*;

use crate::{render::WasmRenderer, utils::set_panic_hook};

enum VarBoard {
    BlackAndWhite(RcBoard<BinaryBlock>),
    MultiColor(RcBoard<ColoredBlock>),
}

type HashInt = u32;

lazy_static! {
    static ref BOARDS: Mutex<HashMap<HashInt, VarBoard>> = Mutex::new(HashMap::new());
}

fn boards() -> MutexGuard<'static, HashMap<HashInt, VarBoard>> {
    BOARDS.lock().expect("Cannot lock the boards mutex")
}

#[wasm_bindgen(js_name = initBoard)]
#[must_use]
/// Initialize a nonogram board from the given description.
/// The unique ID (based on the content) returned to use the board later.
pub fn init_board(content: &str) -> HashInt {
    set_panic_hook();

    let id = calculate_hash(&content);
    if boards().contains_key(&id) {
        // the board already here
        return id;
    }

    let parser = DetectedParser::with_content(content).expect("Parsing failed");
    let new_board = match parser.infer_scheme() {
        PuzzleScheme::MultiColor => {
            let board = parser.parse_rc();
            board.write().reduce_colors();
            VarBoard::MultiColor(board)
        }
        PuzzleScheme::BlackAndWhite => {
            let board = parser.parse_rc();
            VarBoard::BlackAndWhite(board)
        }
    };
    let old_value = boards().insert(id, new_board);
    assert!(old_value.is_none());
    id
}

#[wasm_bindgen]
/// Find a board by given ID and solve it.
/// The last found solution will be set to render it later.
pub fn solve(hash: HashInt, max_solutions: usize) {
    let board = &boards()[&hash];
    match board {
        VarBoard::BlackAndWhite(board) => solve_and_render(board, max_solutions),
        VarBoard::MultiColor(board) => solve_and_render(board, max_solutions),
    }
}

#[wasm_bindgen]
impl WasmRenderer {
    #[wasm_bindgen(constructor)]
    pub fn for_board(hash: HashInt) -> Self {
        let board = &boards()[&hash];
        match board {
            VarBoard::BlackAndWhite(board) => Self::with_black_and_white(board),
            VarBoard::MultiColor(board) => Self::with_colored(board),
        }
    }
}

fn solve_and_render<B>(board: &RcBoard<B>, max_solutions: usize)
where
    B: Block + Display,
    B::Color: DynamicColor + Display,
{
    let solutions = solve_nonogram::<_, LineSolver<_>, FullProbe<_>>(
        RcBoard::clone(board),
        Some(max_solutions),
    )
    .unwrap();

    if let Some(solutions) = solutions {
        // force to find all solutions up to `max_solutions`
        let last_solution = solutions.last().expect("No solutions found");
        Board::restore_with_callback(RcBoard::clone(board), last_solution);
    }
}

fn calculate_hash<T: Hash>(t: &T) -> HashInt {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish() as HashInt
}
