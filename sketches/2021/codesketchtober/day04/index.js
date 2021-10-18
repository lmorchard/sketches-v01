import {
  pipe,
  defineQuery,
  defineComponent,
  Types,
  removeEntity,
  addEntity,
} from "../../../../vendor/pkg/bitecs.js";

import { hslToRgb } from "../../../../lib/hslToRgb.js";

import { BaseComponentProxy, BaseEntityProxy } from "../../../../lib/ecsUtils.js";
import * as World from "../../../../lib/world.js";

import { autoSizedRenderer } from "../../../../lib/viewport/pixi.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";

import { Pane } from "../../../../vendor/pkg/tweakpane.js";

const LIFE_GRID_WIDTH = 50;
const LIFE_GRID_HEIGHT = 50;

async function main() {
  const world = World.init();

  // HACK: use up eid = 0 so we can use it as a sentinel.
  // Need a better way to handle this!
  const zeroEid = addEntity(world);

  const lifeGrid = [];
  for (let x = 0; x < LIFE_GRID_WIDTH; x++) {
    // lifeGrid.push(new Uint32Array(LIFE_GRID_HEIGHT));
    lifeGrid.push(new Array(LIFE_GRID_HEIGHT));
  }
  world.lifeGrid = lifeGrid;
  world.autospawnDelay = 0.0;

  const renderOptions = {};

  const lifeOptions = {
    stepPeriod: 0.05,
    growthSpeed: 0.5,
    initialHue: 135 / 360,
    autospawnEnabled: true,
    autospawnPeriod: 5,
  };

  const { paneUpdateSystem } = setupTwiddles({
    title: "Life and Growth",
    expanded: true,
    world,
    renderOptions,
    lifeOptions,
  });

  world.run(
    pipe(lifeUpdateSystem(lifeOptions), paneUpdateSystem),
    pipe(autoSizedRenderer(renderOptions), lifeRenderer(renderOptions))
  );

  spawnRandomCells(world, LIFE_GRID_WIDTH * 5, lifeOptions.initialHue);

  Object.assign(window, {
    world,
    cellQuery,
    Cell,
  });

  console.log("READY.");
}

function spawnRandomCells(
  world,
  count = LIFE_GRID_WIDTH * 5,
  initialHue = 135 / 360
) {
  for (let idx = 0; idx < count; idx++) {
    CellEntity.spawnRandom(world, initialHue);
  }
}

const Cell = defineComponent({
  alive: Types.ui8,
  presence: Types.f32,
  hue: Types.f32,
  x: Types.ui32,
  y: Types.ui32,
});

class CellProxy extends BaseComponentProxy {
  static component = Cell;
}

class CellEntity extends BaseEntityProxy {
  static components = {
    Cell,
  };

  static defaults = {
    Cell: { alive: true },
  };

  static spawnRandom(world, hue) {
    const { lifeGrid } = world;

    // Find an unoccupied grid cell.
    let x,
      y,
      tries = 0;
    do {
      x = Math.floor(Math.random() * LIFE_GRID_WIDTH);
      y = Math.floor(Math.random() * LIFE_GRID_HEIGHT);

      // Give up if it's too hard to find a clear cell.
      if (tries++ > 10) return;
    } while (lifeGrid[x][y]);

    const cell = this.spawn(world, {
      Cell: { alive: true, presence: Math.random() * 0.5, x, y, hue },
    });

    lifeGrid[x][y] = cell.eid;

    return cell;
  }
}

const cellQuery = defineQuery([Cell]);

const lifeUpdateSystem = (() => {
  // Save on garbage collection pauses by reusing these data structures
  // This leads to some funkiness like needing to skip through arrays with
  // an index, but performance seems better
  const survivals = new Set();
  const deaths = new Set();
  const births = new Array();
  const deadCells = new Array();

  return (options = {}) =>
    (world) => {
      const {
        stepPeriod = 1.0,
        growthSpeed = 0.3,
        autospawnPeriod,
        autospawnEnabled,
      } = options;

      const {
        lifeGrid,
        time: { deltaSec },
      } = world;

      // Update cell "presence" to represent maturity on birth and decay on death
      for (const eid of cellQuery(world)) {
        const growthStep = deltaSec * growthSpeed;
        if (Cell.alive[eid]) {
          Cell.presence[eid] = Math.min(1.0, Cell.presence[eid] + growthStep);
        } else {
          Cell.presence[eid] = Math.max(0.0, Cell.presence[eid] - growthStep);
          if (Cell.presence[eid] === 0.0) {
            lifeGrid[Cell.x[eid]][Cell.y[eid]] = null;
            removeEntity(world, eid);
          }
        }
      }

      // Automatically spawn new random live cells periodically.
      if (autospawnEnabled) {
        if (world.autospawnDelay && world.autospawnDelay > 0) {
          world.autospawnDelay -= deltaSec;
        } else {
          world.autospawnDelay = autospawnPeriod;
          spawnRandomCells(world);
        }
      }

      // Perform a delay between generation updates
      if (
        typeof world.lifeStepDelay === "undefined" ||
        world.lifeStepDelay <= 0.0
      ) {
        world.lifeStepDelay = stepPeriod;
      } else {
        world.lifeStepDelay -= deltaSec;
        return world;
      }

      births.length = 0;
      survivals.clear();
      deaths.clear();

      let scanResult;
      for (const eid of cellQuery(world)) {
        // HACK: since the return result of scanNeighbors is reused, copy
        // the result to preserve it before the inner-loop call for births.
        scanResult = scanNeighbors(world, Cell.x[eid], Cell.y[eid]);
        let liveNeighborCount = scanResult.liveNeighborCount;
        deadCells.length = 0;
        deadCells.push(...scanResult.deadCells);

        if (liveNeighborCount < 2) {
          // Any live cell with fewer than two live neighbours dies, as if by underpopulation.
          deaths.add(eid);
        } else if (liveNeighborCount === 2 || liveNeighborCount === 3) {
          // Any live cell with two or three live neighbours lives on to the next generation.
          survivals.add(eid);
        } else if (liveNeighborCount > 3) {
          // Any live cell with more than three live neighbours dies, as if by overpopulation.
          deaths.add(eid);
        }

        // Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
        for (let idx = 0; idx < deadCells.length; idx += 2) {
          const x = deadCells[idx];
          const y = deadCells[idx + 1];

          // Note: this scanNeighbors call overwrites the result from earlier.
          scanResult = scanNeighbors(world, x, y);
          if (scanResult.liveNeighborCount === 3) {
            births.push(x, y, scanResult.avgHue);
          }
        }
      }

      // Drop presence slightly for survivors so they pulse a little.
      for (const eid of survivals) {
        if (Cell.presence[eid] === 1.0)
          Cell.presence[eid] = 0.4 + Math.random() * 0.2;
      }

      // Apply deaths to cells as appropriate.
      for (const eid of deaths) {
        Cell.alive[eid] = false;
      }

      // Birth new live cells
      for (let idx = 0; idx < births.length; idx += 3) {
        const x = births[idx];
        const y = births[idx + 1];
        const avgHue = births[idx + 2];

        if (lifeGrid[x][y]) {
          // There's a decaying corpse here to be clobbered.
          removeEntity(world, lifeGrid[x][y]);
        }

        // Shift the hue for the new cell slighly from average parents' hue
        let hue = avgHue + 4 / 360;
        if (hue >= 1.0) hue = 0.0;
        const presence = Math.random() * 0.5;
        const newCell = CellEntity.spawn(world, {
          Cell: { alive: true, presence, x, y, hue },
        });
        lifeGrid[x][y] = newCell.eid;
      }

      return world;
    };
})();

const scanNeighbors = (() => {
  // HACK: maintain a private object to reuse for return results to save on
  // garbage collection since this function is called an enormous amount.
  const result = {
    liveNeighborCount: 0,
    deadCells: [],
    hues: [],
    avgHue: 0,
  };

  return (world, scanX, scanY) => {
    const { lifeGrid } = world;

    result.liveNeighborCount = 0;
    result.deadCells.length = 0;
    result.hues.length = 0;

    for (let x = scanX - 1; x <= scanX + 1; x++) {
      for (let y = scanY - 1; y <= scanY + 1; y++) {
        if (
          (x === scanX && y === scanY) ||
          x < 0 ||
          x >= LIFE_GRID_WIDTH ||
          y < 0 ||
          y >= LIFE_GRID_HEIGHT
        ) {
          // Ignore cell's own position and anything out of bounds.
          continue;
        }
        const eid = lifeGrid[x][y];
        if (Cell.alive[eid]) {
          result.liveNeighborCount++;
          result.hues.push(Cell.hue[eid]);
        } else {
          result.deadCells.push(x);
          result.deadCells.push(y);
        }
      }
    }

    result.avgHue =
      result.hues.reduce((acc, hue) => acc + hue, 0) / result.hues.length;

    return result;
  };
})();

const lifeRenderer = (options) => (world) => {
  const {
    stage,
    renderer: { width, height },
  } = world;

  if (!world.lifeGrid) return;
  if (!world.gLife) {
    world.gLife = new Graphics();
    stage.addChild(world.gLife);
  }

  const { lifeGrid, gLife: g } = world;

  const cellSize = [
    (width * 0.95) / LIFE_GRID_WIDTH,
    (height * 0.95) / LIFE_GRID_HEIGHT,
  ].sort((a, b) => a - b)[0];

  const cellMargin = Math.floor(cellSize * 0.25);

  const gridWidth = LIFE_GRID_WIDTH * cellSize;
  const gridHeight = LIFE_GRID_HEIGHT * cellSize;
  const gridLeft = 0 - gridWidth / 2;
  const gridTop = 0 - gridHeight / 2;

  g.clear();
  g.lineStyle(1, 0x33ff33, 0.1);
  g.drawRect(gridLeft, gridTop, gridWidth, gridHeight);

  const cell = new CellProxy();
  for (let x = 0; x < LIFE_GRID_WIDTH; x++) {
    for (let y = 0; y < LIFE_GRID_HEIGHT; y++) {
      const eid = lifeGrid[x][y];
      if (!eid) continue;

      const gridX = gridLeft + x * cellSize;
      const gridY = gridTop + y * cellSize;

      cell.eid = eid;
      if (cell.presence > 0.0) {
        // Render presence as alpha transparency
        const color = hslToRgb(cell.hue, 1.0, 0.5);
        g.lineStyle(1, color, cell.presence);
        g.beginFill(color, cell.presence);
        g.drawRect(
          gridX + cellMargin / 2,
          gridY + cellMargin / 2,
          cellSize - cellMargin,
          cellSize - cellMargin
        );
      }
    }
  }

  return world;
};

function setupTwiddles({
  title = "Twiddles",
  expanded = false,
  world,
  renderOptions,
  lifeOptions,
}) {
  const pane = new Pane();

  const f = pane.addFolder({ title, expanded });
  f.addMonitor(world, "fps" /*, { view: "graph", min: 0, max: 65 } */);
  /*
  f.addInput(renderOptions, "zoom", { min: 0.1, max: 10.0 });
  f.addInput(renderOptions, "camera", {
    x: { min: -1000, max: 1000 },
    y: { min: -1000, max: 1000 },
  });
  */
  f.addInput(lifeOptions, "stepPeriod", { min: 0.01, max: 2.0 });
  f.addSeparator();
  f.addInput(lifeOptions, "autospawnEnabled");
  f.addInput(lifeOptions, "autospawnPeriod", { min: 0.5, max: 5 });
  f.addMonitor(world, "autospawnDelay");
  f.addButton({ title: "Spawn" }).on("click", () => spawnRandomCells(world));
  f.addSeparator();
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
