use std::collections::HashMap;
use std::sync::Mutex;

use nonogrid::{
    block::{binary::BinaryBlock, multicolor::ColoredBlock},
    board::Board,
    parser::{BoardParser, PuzzleScheme, WebPbn},
    render::{Renderer, ShellRenderer},
    solver::{self, line::DynamicSolver, probing::FullProbe1},
    utils::rc::MutRc,
};

use lazy_static::lazy_static;
use wasm_bindgen::prelude::*;

//mod utils;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

lazy_static! {
    static ref BINARY_BOARDS: Mutex<HashMap<u16, MutRc<Board<BinaryBlock>>>> =
        Mutex::new(HashMap::new());
    static ref COLORED_BOARDS: Mutex<HashMap<u16, MutRc<Board<ColoredBlock>>>> =
        Mutex::new(HashMap::new());
}

fn init_board<P: BoardParser>(id: u16, content: String) -> String {
    let parser = P::with_content(content).unwrap();
    match parser.infer_scheme() {
        PuzzleScheme::MultiColor => {
            let board = parser.parse();
            let board = MutRc::new(board);

            COLORED_BOARDS
                .lock()
                .unwrap()
                .insert(id, MutRc::clone(&board));
            ShellRenderer::with_board(board).render()
        }
        PuzzleScheme::BlackAndWhite => {
            let board = parser.parse();
            let board = MutRc::new(board);

            BINARY_BOARDS
                .lock()
                .unwrap()
                .insert(id, MutRc::clone(&board));
            ShellRenderer::with_board(board).render()
        }
    }

    //thread::spawn(move || solve(id, multi_color));
}

#[wasm_bindgen]
pub fn webpbn_board(id: u16, content: String) -> String {
    init_board::<WebPbn>(id, content)
}

#[wasm_bindgen]
pub fn solve(id: u16) -> String {
    if let Some(board) = BINARY_BOARDS.lock().unwrap().get(&id) {
        solver::run::<_, DynamicSolver<_>, FullProbe1<_>>(MutRc::clone(board), Some(2), None, None)
            .unwrap();

        ShellRenderer::with_board(MutRc::clone(board)).render()
    } else {
        let board = &COLORED_BOARDS.lock().unwrap()[&id];
        solver::run::<_, DynamicSolver<_>, FullProbe1<_>>(MutRc::clone(board), Some(2), None, None)
            .unwrap();

        ShellRenderer::with_board(MutRc::clone(board)).render()
    }
}
