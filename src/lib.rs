use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};

use nonogrid::block::binary::BinaryBlock;
use nonogrid::block::multicolor::ColoredBlock;
use nonogrid::board::Board;
use nonogrid::parser::{BoardParser, PuzzleScheme, WebPbn};
use nonogrid::render::{Renderer, ShellRenderer};
use nonogrid::solver;
use nonogrid::solver::line::DynamicSolver;
use nonogrid::solver::probing::FullProbe1;

use lazy_static::lazy_static;
use wasm_bindgen::prelude::*;

//mod utils;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

lazy_static! {
    static ref BINARY_BOARDS: Mutex<HashMap<u16, Arc<RwLock<Board<BinaryBlock>>>>> =
        Mutex::new(HashMap::new());
    static ref COLORED_BOARDS: Mutex<HashMap<u16, Arc<RwLock<Board<ColoredBlock>>>>> =
        Mutex::new(HashMap::new());
}

fn init_board<P: BoardParser>(id: u16, content: String) -> String {
    let parser = P::with_content(content).unwrap();
    match parser.infer_scheme() {
        PuzzleScheme::MultiColor => {
            let board = parser.parse();
            let board = Arc::new(RwLock::new(board));

            COLORED_BOARDS
                .lock()
                .unwrap()
                .insert(id, Arc::clone(&board));
            ShellRenderer::with_board(Arc::clone(&board)).render()
        }
        PuzzleScheme::BlackAndWhite => {
            let board = parser.parse();
            let board = Arc::new(RwLock::new(board));

            BINARY_BOARDS.lock().unwrap().insert(id, Arc::clone(&board));
            ShellRenderer::with_board(Arc::clone(&board)).render()
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
        let board = Arc::clone(&board);
        solver::run::<_, DynamicSolver<_>, FullProbe1<_>>(Arc::clone(&board), Some(2), None, None)
            .unwrap();

        ShellRenderer::with_board(board).render()
    } else {
        let board = Arc::clone(&COLORED_BOARDS.lock().unwrap()[&id]);
        solver::run::<_, DynamicSolver<_>, FullProbe1<_>>(Arc::clone(&board), Some(2), None, None)
            .unwrap();

        ShellRenderer::with_board(board).render()
    }
}
