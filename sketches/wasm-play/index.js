import WasmPlayInit from "wasm_play";
import PerlinInit, { NoiseGrid } from "perlin";

async function main() {
  const WasmPlay = await WasmPlayInit();
  const Perlin = await PerlinInit();

  console.log(WasmPlay.add(2, 5));
  console.log(WasmPlay.mult(5, 5, 3));

  console.log(Perlin.noise(0.1, 0.2, 0.3));
  console.log(Perlin.noise(0.2, 0.2, 0.3));
  console.log(Perlin.noise(0.3, 0.2, 0.3));

  const noise = window.noise = (x, y, z) => {
    const grid = NoiseGrid.new(x, y, z);
    const cells = new Float64Array(
      Perlin.memory.buffer,
      grid.cells(),
      grid.width() * grid.height()
    );
    return cells;
  };

  console.log("CELLS", noise(10, 10, 0.2));

  console.log("READY.");

  /*
  const drawCells = () => {
    const WIDTH = window.innerWidth;
    const HEIGHT = window.innerHeight;

    let z = Math.floor(Math.random() * 10000);
    const canvas = document.getElementById("perlin-noise-canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${HEIGHT}px`;
    const contextType = '2d';
    const ctx = canvas.getContext(contextType);
    if (!ctx) {
        throw new Error(`"${contextType}" is not a valid rendering context.`)
    }
    Play.draw(ctx, canvas.width, canvas.height, z);
  };

  drawCells();
  window.onresize = drawCells;  
  */
}

main().catch(console.error);
