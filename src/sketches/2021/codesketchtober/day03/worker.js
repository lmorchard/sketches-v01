importScripts("../../../../dist/noise-generator/index-no-modules.js");
const { noise, Marcher, PerlinNoiseGrid, SimplexNoiseGrid } = wasm_bindgen;

async function init() {
  const wasm = await wasm_bindgen(
    "../../../../dist/noise-generator/index-no-modules_bg.wasm"
  );

  const simplexNoiseGrid = SimplexNoiseGrid.new();

  self.onmessage = async (event) => {
    const { data } = event;
    const { op } = data;

    switch (op) {
      case "generateNoise": {
        self.postMessage({ op: "generateNoiseStart" });

        const {
          scale = 0.005,
          z = 1.0,
          startX = 0,
          stepX = 1,
          endX = 32,
          startY = 0,
          stepY = 1,
          endY = 32,
        } = data;

        const tStart = Date.now();

        simplexNoiseGrid.update(
          scale,
          z,
          startX,
          stepX,
          endX,
          startY,
          stepY,
          endY
        );

        const cells = new Float64Array(
          wasm.memory.buffer,
          simplexNoiseGrid.cells(),
          simplexNoiseGrid.width() * simplexNoiseGrid.height()
        );

        const tEnd = Date.now();

        self.postMessage({
          op: "generateNoiseResult",
          time: { start: tStart, end: tEnd, duration: tEnd - tStart },
          width: simplexNoiseGrid.width(),
          height: simplexNoiseGrid.height(),
          cells,
        });

        break;
      }
    }
  };

  self.postMessage({ op: "ready" });
}

init();
