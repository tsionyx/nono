use std::{cell::RefCell, collections::HashMap, sync::Arc};

use nonogrid::{BinaryBlock, Block, Color, ColorId, ColoredBlock, Description, RcBoard};
use wasm_bindgen::prelude::*;

#[derive(Debug, Copy, Clone)]
struct ColorCode {
    inner: i32,
}

impl ColorCode {
    const SPACE: Self = Self { inner: -1 };
    const UNKNOWN: Self = Self { inner: -2 };

    fn from_rgb(r: u8, g: u8, b: u8) -> Self {
        Self {
            inner: (i32::from(r) << 16) + (i32::from(g) << 8) + i32::from(b),
        }
    }

    /// rgb(0, 0, 0)
    fn black() -> Self {
        Self::from_rgb(0, 0, 0)
    }

    /// rgb(255, 255, 255)
    fn white() -> Self {
        // (1 << 24) - 1
        Self::from_rgb(0xff, 0xff, 0xff)
    }
}

#[allow(clippy::missing_const_for_fn)]
pub(super) fn space_color_code() -> i32 {
    ColorCode::SPACE.inner
}

#[derive(Debug)]
struct BoardWrapper<B>
where
    B: Block,
{
    board: RcBoard<B>,
    rows: Vec<Arc<Description<B>>>,
    columns: Vec<Arc<Description<B>>>,
    color_cache: RefCell<HashMap<ColorId, Option<ColorCode>>>,
}

impl<B> BoardWrapper<B>
where
    B: Block,
{
    fn from_board(board: &RcBoard<B>) -> Self {
        let rows = board
            .read()
            .descriptions(true)
            .iter()
            .map(|desc| Arc::clone(desc))
            .collect();
        let columns = board
            .read()
            .descriptions(false)
            .iter()
            .map(|desc| Arc::clone(desc))
            //.map(|desc| desc.vec.iter().map(|x| x.0 as u16).collect())
            .collect();

        Self {
            board: RcBoard::clone(board),
            rows,
            columns,
            color_cache: RefCell::new(HashMap::new()),
        }
    }

    fn longest_desc(vec: &[Arc<Description<B>>]) -> usize {
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

    fn color_for_id(&self, color_id: ColorId) -> Option<ColorCode> {
        *self
            .color_cache
            .borrow_mut()
            .entry(color_id)
            .or_insert_with(|| {
                let color_desc = self.board.read().desc_by_id(color_id)?;
                let rgb = color_desc.rgb_value();
                Some(ColorCode::from_rgb(rgb.0, rgb.1, rgb.2))
            })
    }

    fn rgb_for_block(&self, block: &B) -> Option<ColorCode> {
        let color_id = block.color().as_color_id();
        if let Some(color_id) = color_id {
            self.color_for_id(color_id)
        } else {
            // BinaryColor
            Some(ColorCode::white())
        }
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

    fn get_colors_for(&self, row: bool, index: usize) -> impl Iterator<Item = ColorCode> + '_ {
        let lines = if row { &self.rows } else { &self.columns };
        lines[index]
            .vec
            .iter()
            .map(move |x| self.rgb_for_block(x).unwrap_or_else(ColorCode::white))
    }

    fn get_row_colors(&self, i: usize) -> Vec<i32> {
        self.get_colors_for(true, i).map(|x| x.inner).collect()
    }

    fn get_column_colors(&self, i: usize) -> Vec<i32> {
        self.get_colors_for(false, i).map(|x| x.inner).collect()
    }

    fn cells_as_colors(&self) -> Vec<i32> {
        self.board
            .read()
            .iter_rows()
            .flatten()
            .map(|cell| {
                if cell == &B::Color::blank() {
                    return ColorCode::SPACE;
                }

                let color_id = cell.as_color_id();
                if let Some(color_id) = color_id {
                    self.color_for_id(color_id).unwrap_or(ColorCode::UNKNOWN)
                } else {
                    // BinaryColor
                    if cell.is_solved() {
                        ColorCode::black()
                    } else {
                        ColorCode::UNKNOWN
                    }
                }
            })
            .map(|code| code.inner)
            .collect()
    }
}

#[wasm_bindgen]
#[derive(Debug)]
pub struct WasmRenderer {
    binary: Option<BoardWrapper<BinaryBlock>>,
    colored: Option<BoardWrapper<ColoredBlock>>,
}

impl WasmRenderer {
    pub fn with_black_and_white(board: &RcBoard<BinaryBlock>) -> Self {
        Self {
            binary: Some(BoardWrapper::from_board(board)),
            colored: None,
        }
    }
    pub fn with_colored(board: &RcBoard<ColoredBlock>) -> Self {
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

    pub fn get_row_colors(&self, i: usize) -> Vec<i32> {
        binary_or_colored!(self.get_row_colors i)
    }

    pub fn get_column_colors(&self, i: usize) -> Vec<i32> {
        binary_or_colored!(self.get_column_colors i)
    }

    pub fn cells_as_colors(&self) -> Vec<i32> {
        binary_or_colored!(self.cells_as_colors)
    }
}
