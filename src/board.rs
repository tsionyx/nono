use std::collections::HashMap;

use nonogrid::{
    block::{
        base::{color::ColorId, Block, Color, Description},
        binary::BinaryBlock,
        multicolor::ColoredBlock,
    },
    board::Board,
    utils::rc::{MutRc, ReadRc},
};

use std::cell::RefCell;

use wasm_bindgen::prelude::*;

struct BoardWrapper<B>
where
    B: Block,
{
    board: MutRc<Board<B>>,
    rows: Vec<ReadRc<Description<B>>>,
    columns: Vec<ReadRc<Description<B>>>,
    color_cache: RefCell<HashMap<ColorId, Option<u32>>>,
}

const WHITE_COLOR_CODE: i32 = -1;
const UNKNOWN_COLOR_CODE: i32 = -2;

#[wasm_bindgen]
pub fn white_color_code() -> i32 {
    WHITE_COLOR_CODE
}

impl<B> BoardWrapper<B>
where
    B: Block,
{
    fn from_board(board: &MutRc<Board<B>>) -> Self {
        let rows = board
            .read()
            .descriptions(true)
            .iter()
            .map(|desc| ReadRc::clone(desc))
            .collect();
        let columns = board
            .read()
            .descriptions(false)
            .iter()
            .map(|desc| ReadRc::clone(desc))
            //.map(|desc| desc.vec.iter().map(|x| x.0 as u16).collect())
            .collect();

        Self {
            board: MutRc::clone(board),
            rows,
            columns,
            color_cache: RefCell::new(HashMap::new()),
        }
    }

    fn longest_desc(vec: &[ReadRc<Description<B>>]) -> usize {
        vec.iter().map(|col| col.vec.len()).max().unwrap_or(0)
    }

    fn rows_number(&self) -> usize {
        self.rows.len()
    }

    fn cols_number(&self) -> usize {
        self.columns.len()
    }

    fn full_height(&self) -> usize {
        let col_height = Self::longest_desc(&self.columns);
        col_height + self.rows_number()
    }

    fn full_width(&self) -> usize {
        let row_width = Self::longest_desc(&self.rows);
        row_width + self.cols_number()
    }

    fn color_for_id(&self, color_id: ColorId) -> Option<u32> {
        *self
            .color_cache
            .borrow_mut()
            .entry(color_id)
            .or_insert_with(|| {
                let color_desc = self.board.read().desc_by_id(color_id)?;
                let rgb = color_desc.rgb_value();
                Some(rgb.0 as u32 * (1 << 16) + rgb.1 as u32 * (1 << 8) + rgb.2 as u32)
            })
    }

    fn rgb_for_block(&self, block: &B) -> Option<u32> {
        let color_id = block.color().as_color_id();
        // BinaryColor
        if color_id.is_none() {
            // (255, 255, 255) = white color
            return Some((1 << 24) - 1);
        }
        self.color_for_id(color_id.unwrap())
    }

    fn get_row(&self, i: usize) -> Vec<u16> {
        self.rows[i].vec.iter().map(|x| x.size() as u16).collect()
    }

    fn get_column(&self, i: usize) -> Vec<u16> {
        self.columns[i]
            .vec
            .iter()
            .map(|x| x.size() as u16)
            .collect()
    }

    fn get_row_colors(&self, i: usize) -> Vec<u32> {
        self.rows[i]
            .vec
            .iter()
            .map(|x| self.rgb_for_block(x).unwrap_or(0))
            .collect()
    }

    fn get_column_colors(&self, i: usize) -> Vec<u32> {
        self.columns[i]
            .vec
            .iter()
            .map(|x| self.rgb_for_block(x).unwrap_or(0))
            .collect()
    }

    fn cells_as_colors(&self) -> Vec<i32> {
        self.board
            .read()
            .iter_rows()
            .flatten()
            .map(|cell| {
                if cell == &B::Color::blank() {
                    return WHITE_COLOR_CODE;
                }

                let color_id = cell.as_color_id();
                // BinaryColor
                if color_id.is_none() {
                    return if !cell.is_solved() {
                        UNKNOWN_COLOR_CODE
                    } else {
                        0 // (0, 0, 0) = black color
                    };
                }

                self.color_for_id(color_id.unwrap())
                    .map_or(UNKNOWN_COLOR_CODE, |x| x as i32)
            })
            .collect()
    }
}

#[wasm_bindgen]
pub struct WasmRenderer {
    binary: Option<BoardWrapper<BinaryBlock>>,
    colored: Option<BoardWrapper<ColoredBlock>>,
}

impl WasmRenderer {
    pub fn with_binary_board(board: &MutRc<Board<BinaryBlock>>) -> Self {
        Self {
            binary: Some(BoardWrapper::from_board(board)),
            colored: None,
        }
    }
    pub fn with_colored_board(board: &MutRc<Board<ColoredBlock>>) -> Self {
        Self {
            binary: None,
            colored: Some(BoardWrapper::from_board(board)),
        }
    }
}

#[wasm_bindgen]
impl WasmRenderer {
    pub fn rows_number(&self) -> usize {
        self.binary
            .as_ref()
            .map(|ds| ds.rows_number())
            .or_else(|| self.colored.as_ref().map(|ds| ds.rows_number()))
            .expect("At least one option should be set")
    }

    pub fn cols_number(&self) -> usize {
        self.binary
            .as_ref()
            .map(|ds| ds.cols_number())
            .or_else(|| self.colored.as_ref().map(|ds| ds.cols_number()))
            .expect("At least one option should be set")
    }

    pub fn full_height(&self) -> usize {
        self.binary
            .as_ref()
            .map(|ds| ds.full_height())
            .or_else(|| self.colored.as_ref().map(|ds| ds.full_height()))
            .expect("At least one option should be set")
    }

    pub fn full_width(&self) -> usize {
        self.binary
            .as_ref()
            .map(|ds| ds.full_width())
            .or_else(|| self.colored.as_ref().map(|ds| ds.full_width()))
            .expect("At least one option should be set")
    }

    pub fn get_row(&self, i: usize) -> Vec<u16> {
        self.binary
            .as_ref()
            .map(|ds| ds.get_row(i))
            .or_else(|| self.colored.as_ref().map(|ds| ds.get_row(i)))
            .expect("At least one option should be set")
    }

    pub fn get_column(&self, i: usize) -> Vec<u16> {
        self.binary
            .as_ref()
            .map(|ds| ds.get_column(i))
            .or_else(|| self.colored.as_ref().map(|ds| ds.get_column(i)))
            .expect("At least one option should be set")
    }

    pub fn get_row_colors(&self, i: usize) -> Vec<u32> {
        self.binary
            .as_ref()
            .map(|ds| ds.get_row_colors(i))
            .or_else(|| self.colored.as_ref().map(|ds| ds.get_row_colors(i)))
            .expect("At least one option should be set")
    }

    pub fn get_column_colors(&self, i: usize) -> Vec<u32> {
        self.binary
            .as_ref()
            .map(|ds| ds.get_column_colors(i))
            .or_else(|| self.colored.as_ref().map(|ds| ds.get_column_colors(i)))
            .expect("At least one option should be set")
    }

    pub fn cells_as_colors(&self) -> Vec<i32> {
        self.binary
            .as_ref()
            .map(|ds| ds.cells_as_colors())
            .or_else(|| self.colored.as_ref().map(|ds| ds.cells_as_colors()))
            .expect("At least one option should be set")
    }
}
