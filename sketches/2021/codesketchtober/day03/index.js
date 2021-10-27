import { Pane } from "../../../../vendor/pkg/tweakpane.js";

import NoiseGeneratorInit, { SimplexNoiseGrid } from "../../../../dist/noise-generator/index.js";

async function main() {
  var canvas = document.getElementById("cnvsb");
  var g = canvas.getContext("2d");

  var w = 900;
  var resolution = 32;
  const gridSize = w / resolution;
  const pixSize = Math.ceil(gridSize);

  cnvsb.width = cnvsb.height = w;

  const NoiseGenerator = await NoiseGeneratorInit();

  const state = {
    x: 0,
    y: 0,
    z: 0,
    inProgress: false,
    generateContourMapInProgress: false,
    width: null,
    height: null,
    cells: null,
    isovalCount: 0,
    noise: null,
    contour: null,
    resolution,
    gridSize,
    pixSize,
    w,
    NoiseGenerator,
  };

  const worker = new Worker("./worker.js");

  // TODO SharedArrayBuffer has a lot of requirements to make work in
  // localhost or in Github Pages without setting headers, figure them out?
  // https://www.npmjs.com/package/coi-serviceworker
  // https://dev.to/stefnotch/enabling-coop-coep-without-touching-the-server-2d3n
  // const cellsResult = new SharedArrayBuffer();

  const update = () => {
    state.x += 0.75;
    state.y += 0.75;
    state.z += 0.75;

    if (!state.generateContourMapInProgress) {
      state.generateContourMapInProgress = true;
      worker.postMessage({
        op: "generateContourMap",
        scale: 0.005,
        z: state.z,
        startX: state.x,
        stepX: gridSize,
        endX: state.x + w,
        startY: state.y,
        stepY: gridSize,
        endY: state.y + w,
      });
    }

    if (state.cells) {
      drawFrame(g, state);
    }

    requestAnimationFrame(update);
  };

  worker.onmessage = onWorkerMessage({ worker, g, state, update });

  console.log("READY.");
}

const onWorkerMessage =
  ({ worker, g, state, update }) =>
  (event) => {
    const { data } = event;
    const { op } = data;

    switch (op) {
      case "ready": {
        console.log("WORKER READY.");
        update();
        break;
      }
      case "generateContourMapResult": {
        const {
          width,
          height,
          isoval_count,
          isoval_step_size,
          noise,
          contour,
        } = data;
        state.generateContourMapInProgress = false;
        state.cellsWidth = width;
        state.cellsHeight = height;
        state.isovalCount = isoval_count;
        state.isovalStepSize = isoval_step_size;
        state.noise = noise;
        state.cells = noise;
        state.contour = contour;
        break;
      }
      default: {
        //console.log("DEFAULT HANDLER", data);
      }
    }
  };

function drawFrame(
  g,
  {
    cells,
    resolution,
    gridSize,
    pixSize,
    isovalCount,
    isovalStepSize,
    contour,
  }
) {
  g.clearRect(0, 0, cnvsb.width, cnvsb.width);

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const noiseVal = cells[y * resolution + x];
      const rnd = Math.max(0.0, Math.min(1.0, (noiseVal + 1.0) / 2 - 0.15));

      var v1 = Math.floor(rnd * 255);
      g.fillStyle = "rgb(" + v1 + "," + v1 + "," + v1 + ")";
      g.fillRect(x * gridSize, y * gridSize, pixSize, pixSize);
    }
  }

  let saturation = 10;
  for (let isoIdx = 0; isoIdx < isovalCount; isoIdx++) {
    g.lineWidth = 1 / (gridSize / 3);
    g.strokeStyle = `hsla(120, ${saturation}%, 50%)`;
    saturation += 20;

    if (true) {
      for (let y = 1; y < resolution; y++) {
        for (let x = 1; x < resolution; x++) {
          const cell =
            contour[
              isovalStepSize * isoIdx + (y - 1) * (resolution - 1) + (x - 1)
            ];

          g.save();
          g.translate((x - 0.5) * gridSize, (y - 0.5) * gridSize);

          g.scale(gridSize / 2, gridSize / 2);
          g.beginPath();

          switch (cell) {
            case 0:
            case 15:
              break;
            case 1:
            case 14:
              g.moveTo(0, 1);
              g.lineTo(1, 2);
              break;
            case 2:
            case 13:
              g.moveTo(1, 2);
              g.lineTo(2, 1);
              break;
            case 3:
            case 12:
              g.moveTo(0, 1);
              g.lineTo(2, 1);
              break;
            case 4:
              g.moveTo(1, 0);
              g.lineTo(2, 1);
              break;
            case 5:
              g.moveTo(0, 1);
              g.lineTo(1, 0);
              g.moveTo(1, 2);
              g.lineTo(2, 1);
              break;
            case 6:
            case 9:
              g.moveTo(1, 0);
              g.lineTo(1, 2);
              break;
            case 7:
              g.moveTo(0, 1);
              g.lineTo(1, 0);
              break;
            case 8:
              g.moveTo(0, 1);
              g.lineTo(1, 0);
              break;
            case 10:
              g.moveTo(0, 1);
              g.lineTo(1, 2);
              g.moveTo(1, 0);
              g.lineTo(2, 1);
              break;
            case 11:
              g.moveTo(1, 0);
              g.lineTo(2, 1);
              break;
          }
          g.stroke();
          g.restore();
        }
      }
    }
  }
}

main().catch(console.error);
