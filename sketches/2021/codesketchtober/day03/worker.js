importScripts("../../../../dist/noise-generator/index-no-modules.js");
const { noise, Marcher, PerlinNoiseGrid, SimplexNoiseGrid, ContourMap } =
  wasm_bindgen;

async function init() {
  const wasm = await wasm_bindgen(
    "../../../../dist/noise-generator/index-no-modules_bg.wasm"
  );

  const simplexNoiseGrid = SimplexNoiseGrid.new();
  const contourMap = ContourMap.new();

  self.onmessage = async (event) => {
    const { data } = event;
    const { op } = data;

    switch (op) {
      case "generateContourMap": {
        self.postMessage({ op: "generateContourMapStart" });

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

        contourMap.update(
          scale,
          z,
          startX,
          stepX,
          endX,
          startY,
          stepY,
          endY
        );

        const noiseView = new Float64Array(
          wasm.memory.buffer,
          contourMap.result_noise_ptr(),
          contourMap.width() * contourMap.height()
        );
        const noise = Float64Array.from(noiseView);

        const contourView = new Uint8Array(
          wasm.memory.buffer,
          contourMap.result_contour_ptr(),
          contourMap.width() * contourMap.height() * contourMap.isoval_count()
        );
        const contour = Uint8Array.from(contourView);

        const tEnd = Date.now();

        self.postMessage({
          op: "generateContourMapResult",
          time: { start: tStart, end: tEnd, duration: tEnd - tStart },
          width: contourMap.width(),
          height: contourMap.height(),
          isoval_count: contourMap.isoval_count(),
          isoval_step_size: contourMap.isoval_step_size(),
          noise,
          contour,
        });

        break;
      }

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

        const cellsView = new Float64Array(
          wasm.memory.buffer,
          simplexNoiseGrid.cells_ptr(),
          simplexNoiseGrid.width() * simplexNoiseGrid.height()
        );
        const cells = Float64Array.from(cellsView);

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
