//! Wraps the nonogram solver `https://github.com/tsionyx/nonogrid`
//! to use it in the WASM environment.

#![warn(absolute_paths_not_starting_with_crate)]
#![warn(anonymous_parameters)]
#![warn(box_pointers)]
#![warn(deprecated_in_future)]
#![warn(elided_lifetimes_in_paths)]
#![warn(explicit_outlives_requirements)]
#![warn(indirect_structural_match)]
#![warn(keyword_idents)]
#![warn(macro_use_extern_crate)]
#![warn(meta_variable_misuse)]
#![warn(missing_copy_implementations)]
#![warn(missing_debug_implementations)]
#![warn(missing_doc_code_examples)]
#![warn(missing_docs)]
#![warn(non_ascii_idents)]
#![warn(private_doc_tests)]
#![warn(single_use_lifetimes)]
#![warn(trivial_casts)]
#![warn(trivial_numeric_casts)]
#![warn(unreachable_pub)]
#![warn(unsafe_code)]
#![warn(unstable_features)]
#![warn(unused_extern_crates)]
#![warn(unused_import_braces)]
#![warn(unused_labels)]
#![warn(unused_lifetimes)]
#![warn(unused_qualifications)]
#![warn(unused_results)]
#![warn(variant_size_differences)]
#![allow(clippy::cast_possible_truncation)]

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

use self::board::WasmRenderer;

mod board;
mod utils;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc<'_> = wee_alloc::WeeAlloc::INIT;

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

#[wasm_bindgen]
#[must_use]
/// Initialize a nonogram board from the given description.
/// The unique ID (based on the content) returned to use the board later.
pub fn init_board(content: &str) -> HashInt {
    utils::set_panic_hook();

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
    pub fn for_board(hash: HashInt) -> Self {
        let board = &boards()[&hash];
        match board {
            VarBoard::BlackAndWhite(board) => Self::with_black_and_white(board),
            VarBoard::MultiColor(board) => Self::with_colored(board),
        }
    }

    pub fn white_color_code() -> i32 {
        board::space_color_code()
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
