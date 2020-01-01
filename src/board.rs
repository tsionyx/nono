use std::cell::RefCell;
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

pub(super) const WHITE_COLOR_CODE: i32 = -1;
const UNKNOWN_COLOR_CODE: i32 = -2;

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
                Some((u32::from(rgb.0) << 16) + (u32::from(rgb.1) << 8) + u32::from(rgb.2))
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
                    return if cell.is_solved() {
                        0 // (0, 0, 0) = black color
                    } else {
                        UNKNOWN_COLOR_CODE
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
    pub fn with_black_and_white(board: &MutRc<Board<BinaryBlock>>) -> Self {
        Self {
            binary: Some(BoardWrapper::from_board(board)),
            colored: None,
        }
    }
    pub fn with_colored(board: &MutRc<Board<ColoredBlock>>) -> Self {
        Self {
            binary: None,
            colored: Some(BoardWrapper::from_board(board)),
        }
    }
}

macro_rules! binary_or_colored {
    ($self:ident.$method:ident) => {
        $self.binary
            .as_ref()
            .map(BoardWrapper::$method)
            .or_else(|| $self.colored.as_ref().map(BoardWrapper::$method))
            .expect("At least one option should be set")
    };

    ($self:ident.$method:ident $( $arg:expr ),+ $(,)?) => {
        $self.binary
            .as_ref()
            .map(|board| board.$method($($arg,)+))
            .or_else(|| $self.colored.as_ref().map(|board| board.$method($($arg,)+)))
            .expect("At least one option should be set")
    };
}

#[wasm_bindgen]
impl WasmRenderer {
    pub fn rows_number(&self) -> usize {
        binary_or_colored!(self.rows_number)
    }

    pub fn cols_number(&self) -> usize {
        binary_or_colored!(self.cols_number)
    }

    pub fn full_height(&self) -> usize {
        binary_or_colored!(self.full_height)
    }

    pub fn full_width(&self) -> usize {
        binary_or_colored!(self.full_width)
    }

    pub fn get_row(&self, i: usize) -> Vec<u16> {
        binary_or_colored!(self.get_row i)
    }

    pub fn get_column(&self, i: usize) -> Vec<u16> {
        binary_or_colored!(self.get_column i)
    }

    pub fn get_row_colors(&self, i: usize) -> Vec<u32> {
        binary_or_colored!(self.get_row_colors i)
    }

    pub fn get_column_colors(&self, i: usize) -> Vec<u32> {
        binary_or_colored!(self.get_column_colors i)
    }

    pub fn cells_as_colors(&self) -> Vec<i32> {
        binary_or_colored!(self.cells_as_colors)
    }
}
