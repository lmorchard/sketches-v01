import {
  pipe,
  defineQuery,
  defineComponent,
  Types,
  removeEntity,
  setDefaultSize,
  addEntity,
} from "bitecs";

import { hslToRgb } from "../../../../lib/hslToRgb.js";
import easings from "../../../../lib/easings.js";
import { lerp } from "../../../../lib/transitions.js";
import { BaseComponentProxy, BaseEntityProxy } from "../../../../lib/ecsUtils";
import * as Stats from "../../../../lib/stats.js";
import * as World from "../../../../lib/world.js";

import perlin, { ImprovedNoise } from "../../../../lib/perlin.js";

import { autoSizedRenderer } from "../../../../lib/viewport/pixi.js";
import * as PIXI from "pixi.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { AdvancedBloomFilter, CRTFilter, RGBSplitFilter } from "pixi-filters";

import { Pane } from "tweakpane";

import NoiseGeneratorInit, { SimplexNoiseGrid, Marcher } from "noise-generator";

async function main() {
  var canvas = document.getElementById("cnvsb");
  var g = canvas.getContext("2d");

  var w = 900;
  var resolution = 128;
  const gridSize = w / resolution;
  const pixSize = Math.ceil(gridSize * 1.2);

  cnvsb.width = cnvsb.height = w;

  const NoiseGenerator = await NoiseGeneratorInit();
  const marcher = Marcher.new();

  const state = {
    x: 0,
    y: 0,
    z: 0,
    inProgress: false,
    width: null,
    height: null,
    cells: null,
    resolution,
    gridSize,
    pixSize,
    w,
    marcher,
    NoiseGenerator,
  };

  const worker = new Worker("./worker.js", { type: "module" });

  const update = () => {
    state.x += 0.5;
    state.y += 0.5;
    state.z += 0.5;

    if (!state.inProgress) {
      state.inProgress = true;
      worker.postMessage({
        op: "generateNoise",
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

  // world.run(pipe(paneUpdateSystem), pipe(autoSizedRenderer(), geoRenderer()));

  console.log("READY.");
}

const onWorkerMessage =
  ({ worker, g, marcher, state, update }) =>
  (event) => {
    const { data } = event;
    const { op } = data;

    switch (op) {
      case "ready": {
        console.log("WORKER READY.");
        update();
        break;
      }
      case "generateNoiseResult": {
        const { width, height, cells } = data;
        state.cells = cells;
        state.cellsWidth = width;
        state.cellsHeight = height;
        state.inProgress = false;
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
    cellsWidth,
    cellsHeight,
    resolution,
    gridSize,
    pixSize,
    marcher,
    NoiseGenerator,
  }
) {
  g.clearRect(0, 0, cnvsb.width, cnvsb.width);

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const noiseVal = cells[y * resolution + x];
      const rnd = Math.max(0.0, Math.min(1.0, (noiseVal + 1.0) / 2 - 0.1));

      var v1 = Math.floor(rnd * 255);
      g.fillStyle = "rgb(" + v1 + "," + v1 + "," + v1 + ")";
      g.fillRect(x * gridSize, y * gridSize, pixSize, pixSize);
    }
  }

  /*
  for (let isovalue = -1.0; isovalue < 1.0; isovalue += 0.2) {
    g.strokeStyle = `hsl(${Math.floor(
      120 + ((isovalue + 1.0) / 2) * 200
    )}, 100%, 50%)`;
    g.lineWidth = 1 / (gridSize / 2);

    marcher.update(isovalue, cellsWidth, cellsHeight, cells);
    const marcher_cells = new Uint8Array(
      NoiseGenerator.memory.buffer,
      marcher.cells(),
      marcher.width() * marcher.height()
    );

    for (let y = 1; y < resolution; y++) {
      for (let x = 1; x < resolution; x++) {
        const cell = marcher_cells[(y - 1) * resolution + (x - 1)];

        g.save();
        g.translate((x - 1) * gridSize, (y - 1) * gridSize);

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
  */
}

function setupTwiddles({ title = "Twiddles", expanded = false, world }) {
  const pane = new Pane();

  const f = pane.addFolder({ title, expanded });
  f.addMonitor(world, "fps" /*, { view: "graph", min: 0, max: 65 } */);
  f.addButton({ title: "Stop" }).on("click", () => world.loop.stop());
  f.addButton({ title: "Start" }).on("click", () => world.loop.start());

  return {
    pane,
    paneUpdateSystem: (world) => {
      pane.refresh();
      return world;
    },
  };
}

main().catch(console.error);
