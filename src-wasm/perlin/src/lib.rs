mod utils;
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
pub fn greet() {
    alert("Hello, perlin!");
}

static P: [usize; 512] = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69,
    142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219,
    203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230,
    220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
    132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173,
    186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
    59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163,
    70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
    178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162,
    241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204,
    176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141,
    128, 195, 78, 66, 215, 61, 156, 180, 151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194,
    233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234,
    75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174,
    20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83,
    111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25,
    63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188,
    159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147,
    118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170,
    213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253,
    19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193,
    238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31,
    181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
    222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
];

#[wasm_bindgen]
pub struct NoiseGrid {
    width: u32,
    height: u32,
    cells: Vec<f64>,
}

#[wasm_bindgen]
impl NoiseGrid {
    pub fn new(width: u32, height: u32, z: f64) -> NoiseGrid {
        let cells = (0..height)
            .flat_map(|row| {
                (0..width)
                    .map(|col| {
                        let x = col as f64 / width as f64;
                        let y = row as f64 / height as f64;
                        noise(x, y, z)
                    })
                    .collect::<Vec<f64>>()
            })
            .collect::<Vec<f64>>();

        NoiseGrid {
            width,
            height,
            cells,
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells(&self) -> *const f64 {
        self.cells.as_ptr()
    }
}

/// Runs `noise` over an entire grid, given its width, height, and z
#[wasm_bindgen]
pub fn noise_grid(width: usize, height: usize, z: f64) -> Vec<u8> {
    (0..height)
        .flat_map(|row| {
            (0..width)
                .map(|col| {
                    let x = col as f64 / width as f64;
                    let y = row as f64 / height as f64;
                    let noise = noise(x, y, z);
                    distinct_lines(noise)
                })
                .flatten()
                .collect::<Vec<u8>>()
        })
        .collect::<Vec<u8>>()
}

/// Binarizes a noise value, based on the first two decimal places
fn distinct_lines(noise: f64) -> Vec<u8> {
    let gray = vec![237, 239, 242, 255]; // RGBA
    let white = vec![255, 255, 255, 255]; // RGBA
    let decimal_places = (noise * 100.0).round() / 100.0;
    if decimal_places == 0.10
        || decimal_places == 0.30
        || decimal_places == 0.40
        || decimal_places == 0.50
        || decimal_places == 0.07
        || decimal_places == 0.02
    {
        gray
    } else {
        white
    }
}

/// Ripped straight off of Rosetta Code for a Rustlang interpretation of Perlin Noise
/// https://rosettacode.org/wiki/Perlin_noise#Rust
/// I don't have the foggiest idea of how this works.
#[wasm_bindgen]
pub fn noise(x: f64, y: f64, z: f64) -> f64 {
    let x0 = x.floor() as usize & 255;
    let y0 = y.floor() as usize & 255;
    let z0 = z.floor() as usize & 255;

    let x = x - x.floor();
    let y = y - y.floor();
    let z = z - z.floor();

    let u = fade(x);
    let v = fade(y);
    let w = fade(z);

    let a = P[x0] + y0;
    let aa = P[a] + z0;
    let ab = P[a + 1] + z0;
    let b = P[x0 + 1] + y0;
    let ba = P[b] + z0;
    let bb = P[b + 1] + z0;

    return lerp(
        w,
        lerp(
            v,
            lerp(u, gradient(P[aa], x, y, z), gradient(P[ba], x - 1.0, y, z)),
            lerp(
                u,
                gradient(P[ab], x, y - 1.0, z),
                gradient(P[bb], x - 1.0, y - 1.0, z),
            ),
        ),
        lerp(
            v,
            lerp(
                u,
                gradient(P[aa + 1], x, y, z - 1.0),
                gradient(P[ba + 1], x - 1.0, y, z - 1.0),
            ),
            lerp(
                u,
                gradient(P[ab + 1], x, y - 1.0, z - 1.0),
                gradient(P[bb + 1], x - 1.0, y - 1.0, z - 1.0),
            ),
        ),
    );
}

fn fade(t: f64) -> f64 {
    t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
}

/// _L_inear int_ERP_olation
fn lerp(t: f64, a: f64, b: f64) -> f64 {
    a + t * (b - a)
}

/// _GRAD_ient
fn gradient(hash: usize, x: f64, y: f64, z: f64) -> f64 {
    let h = hash & 15;
    let u = if h < 8 { x } else { y };
    let v = if h < 4 {
        y
    } else {
        if h == 12 || h == 14 {
            x
        } else {
            z
        }
    };

    return if h & 1 == 0 { u } else { -u } + if h & 2 == 0 { v } else { -v };
}
