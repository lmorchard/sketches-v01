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

    pub fn cells(&self) -> *const f64 {
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
                self.cells[x_step + y_step * width] = self.generate(x * scale, y * scale);
            }
        }
    }
}
