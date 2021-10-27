mod utils;
use opensimplex_noise_rs::OpenSimplexNoise;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub struct SimplexNoiseGrid {
    generator: OpenSimplexNoise,
    width: usize,
    height: usize,
    count: usize,
    cells: Vec<f64>,
}

impl SimplexNoiseGrid {
    pub fn cells(&self) -> &Vec<f64> {
        &self.cells
    }
}

#[wasm_bindgen]
impl SimplexNoiseGrid {
    pub fn new(custom_seed: Option<i64>) -> SimplexNoiseGrid {
        utils::set_panic_hook();
        SimplexNoiseGrid {
            generator: OpenSimplexNoise::new(custom_seed),
            width: 0,
            height: 0,
            count: 0,
            cells: Vec::new(),
        }
    }

    pub fn width(&self) -> usize {
        self.width
    }

    pub fn height(&self) -> usize {
        self.height
    }

    pub fn count(&self) -> usize {
        self.count
    }

    pub fn cells_ptr(&self) -> *const f64 {
        self.cells.as_ptr()
    }

    pub fn generate(&self, x: f64, y: f64) -> f64 {
        self.generator.eval_2d(x, y)
    }

    pub fn generate_3d(&self, x: f64, y: f64, z: f64) -> f64 {
        self.generator.eval_3d(x, y, z)
    }

    pub fn generate_4d(&self, x: f64, y: f64, z: f64, w: f64) -> f64 {
        self.generator.eval_4d(x, y, z, w)
    }

    pub fn update(
        &mut self,
        scale: f64,
        z: f64,
        start_x: f64,
        step_x: f64,
        end_x: f64,
        start_y: f64,
        step_y: f64,
        end_y: f64,
    ) {
        let width = ((end_x - start_x) / step_x).ceil() as usize;
        self.width = width;

        let height = ((end_y - start_y) / step_y).ceil() as usize;
        self.height = height;

        let cell_count = width * height;
        if self.cells.capacity() != cell_count {
            self.cells.resize(cell_count, 0.0);
        }
        self.count = cell_count;

        for y_step in 0..height {
            for x_step in 0..width {
                let x = start_x + step_x * x_step as f64;
                let y = start_y + step_y * y_step as f64;
                self.cells[x_step + y_step * width] =
                    self.generate_3d(x * scale, y * scale, z * scale);
            }
        }
    }
}

#[wasm_bindgen]
pub struct ContourMap {
    noise_grid: SimplexNoiseGrid,
    //marcher: Marcher,
    isoval_count: usize,
    isoval_step_size: usize,
    width: usize,
    height: usize,
    result_contour: Vec<u8>,
}

#[wasm_bindgen]
impl ContourMap {
    pub fn new() -> ContourMap {
        ContourMap {
            noise_grid: SimplexNoiseGrid::new(None),
            isoval_count: 5,
            isoval_step_size: 0,
            width: 0,
            height: 0,
            result_contour: Vec::new(),
        }
    }

    pub fn result_noise_ptr(&self) -> *const f64 {
        self.noise_grid.cells_ptr()
    }

    pub fn result_contour_ptr(&self) -> *const u8 {
        self.result_contour.as_ptr()
    }

    pub fn width(&self) -> usize {
        self.noise_grid.width
    }

    pub fn height(&self) -> usize {
        self.noise_grid.height
    }

    pub fn isoval_count(&self) -> usize {
        self.isoval_count
    }

    pub fn isoval_step_size(&self) -> usize {
        self.isoval_step_size
    }

    pub fn update(
        &mut self,
        scale: f64,
        z: f64,
        start_x: f64,
        step_x: f64,
        end_x: f64,
        start_y: f64,
        step_y: f64,
        end_y: f64,
    ) {
        self.noise_grid
            .update(scale, z, start_x, step_x, end_x, start_y, step_y, end_y);

        self.width = self.noise_grid.width() - 1;
        self.height = self.noise_grid.height() - 1;
        self.isoval_step_size = self.width * self.height;

        self.result_contour.clear();
        self.result_contour
            .resize(self.isoval_count * self.isoval_step_size, 0);

        let cells = self.noise_grid.cells();
        let width = self.noise_grid.width();
        let height = self.noise_grid.height();

        let mut result_contour_idx = 0;
        let isovalue_start = -0.3;
        let isovalue_step = 0.3;
        let isovalue_end = 0.3;
        let isovalue_spread = isovalue_end - isovalue_start;

        self.isoval_count = (isovalue_spread / isovalue_step) as usize;
        
        for isovalue_idx in 0..self.isoval_count {
            let isovalue = isovalue_start + isovalue_step * isovalue_idx as f64;
            for y in 1..height {
                for x in 1..width {
                    let mut line = 0;

                    let lt = cells[(y - 1) * width + (x - 1)];
                    line = line << 1 | (lt > isovalue) as u8;

                    let rt = cells[(y - 1) * width + x];
                    line = line << 1 | (rt > isovalue) as u8;

                    let rb = cells[y * width + x];
                    line = line << 1 | (rb > isovalue) as u8;

                    let lb = cells[y * width + (x - 1)];
                    line = line << 1 | (lb > isovalue) as u8;

                    self.result_contour[result_contour_idx] = line;
                    result_contour_idx += 1;
                }
            }
        }
    }
}
