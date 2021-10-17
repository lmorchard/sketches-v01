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

import * as PIXI from "pixi.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { AdvancedBloomFilter, CRTFilter, RGBSplitFilter } from "pixi-filters";

import { Pane } from "tweakpane";

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

  const renderOptions = {
    camera: { x: 0, y: 0 },
    zoom: 1.0,
  };

  const lifeOptions = {
    stepPeriod: 0.05,
    growthSpeed: 0.5,
    initialHue: 135 / 360,
  };

  const { paneUpdateSystem } = setupTwiddles({
    title: "Life and Growth",
    world,
    renderOptions,
    lifeOptions,
  });

  world.run(
    pipe(lifeUpdateSystem(lifeOptions), paneUpdateSystem),
    pipe(autoSizedRenderer(renderOptions), lifeRenderer(renderOptions))
  );

  spawnRandomCells(world, LIFE_GRID_WIDTH * 10, lifeOptions.initialHue);

  Object.assign(window, {
    world,
    cellQuery,
    Cell,
  });

  console.log("READY.");
}

function spawnRandomCells(world, count = 50, initialHue = 135 / 360) {
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
    let x, y;
    do {
      x = Math.floor(Math.random() * LIFE_GRID_WIDTH);
      y = Math.floor(Math.random() * LIFE_GRID_HEIGHT);
    } while (lifeGrid[x][y]);

    const cell = this.spawn(world, {
      Cell: { alive: true, presence: Math.random() * 0.5, x, y, hue },
    });

    lifeGrid[x][y] = cell.eid;

    return cell;
  }
}

const cellQuery = defineQuery([Cell]);

const lifeUpdateSystem =
  (options = {}) =>
  (world) => {
    const {
      stepPeriod = 1.0,
      growthSpeed = 0.3,
      initialHue = 135 / 360,
    } = options;

    const {
      lifeGrid,
      time: { deltaSec },
    } = world;

    // Update cell "presence" to represent maturity on birth and decay on death
    const cell = new CellProxy();
    for (const eid of cellQuery(world)) {
      cell.eid = eid;
      if (cell.alive) {
        cell.presence = Math.min(1.0, cell.presence + deltaSec * growthSpeed);
      } else {
        cell.presence = Math.max(0.0, cell.presence - deltaSec * growthSpeed);
        if (cell.presence === 0.0) {
          lifeGrid[cell.x][cell.y] = null;
          removeEntity(world, cell.eid);
        }
      }
    }

    // Countdown the delay between generation updates
    if (
      typeof world.lifeStepDelay === "undefined" ||
      world.lifeStepDelay <= 0.0
    ) {
      world.lifeStepDelay = stepPeriod;
    } else {
      world.lifeStepDelay -= deltaSec;
      return world;
    }

    const survivals = new Set();
    const deaths = new Set();
    const births = {};

    for (const eid of cellQuery(world)) {
      cell.eid = eid;

      const { liveNeighborCount, deadCells } = scanNeighbors(
        world,
        cell.x,
        cell.y
      );

      if (liveNeighborCount < 2) {
        // Any live cell with fewer than two live neighbours dies, as if by underpopulation.
        deaths.add(eid);
      } else if (liveNeighborCount === 2 || liveNeighborCount === 3) {
        // Any live cell with two or three live neighbours lives on to the next generation.
        // HACK: dim presence as a "heartbeat"
        survivals.add(eid);
      } else if (liveNeighborCount > 3) {
        // Any live cell with more than three live neighbours dies, as if by overpopulation.
        deaths.add(eid);
      }

      // Any dead cell with exactly three live neighbours becomes a live
      // cell, as if by reproduction.
      for (const [x, y] of deadCells) {
        const { liveNeighborCount, avgHue } = scanNeighbors(world, x, y);
        if (liveNeighborCount === 3) {
          births[`${x}:${y}`] = [x, y, avgHue];
        }
      }
    }

    // Drop presence slightly for survivors so they pulse a little.
    for (const eid of survivals) {
      cell.eid = eid;
      if (cell.presence === 1.0) cell.presence = 0.4 + Math.random() * 0.2;
    }

    // Apply deaths to cells as appropriate.
    for (const eid of deaths) {
      Cell.alive[eid] = false;
    }

    // Birth new live cells
    for (const [x, y, avgHue] of Object.values(births)) {
      if (lifeGrid[x][y]) {
        // There's a decaying corpse here to be clobbered.
        removeEntity(world, lifeGrid[x][y]);
      }

      // Shift the hue for the new cell slighly from average parents' hue
      let hue = avgHue + 4 / 360;
      if (hue >= 1.0) hue = 0.0;

      const newCell = CellEntity.spawn(world, {
        Cell: {
          alive: true,
          presence: Math.random() * 0.5,
          x,
          y,
          hue,
        },
      });
      lifeGrid[x][y] = newCell.eid;
    }

    return world;
  };

const scanNeighbors = (world, scanX, scanY) => {
  const { lifeGrid } = world;

  let liveNeighborCount = 0;
  const hues = [];
  const deadCells = [];
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
        liveNeighborCount++;
        hues.push(Cell.hue[eid]);
      } else {
        deadCells.push([x, y]);
      }
    }
  }

  const avgHue = hues.reduce((acc, hue) => acc + hue, 0) / hues.length;

  return { liveNeighborCount, deadCells, avgHue };
};

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

  const cellMargin = Math.floor(cellSize * 0.15);

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

const autoSizedRenderer =
  (options = {}) =>
  (world) => {
    const { parentId = "main", camera = { x: 0, y: 0 }, zoom = 1.0 } = options;

    if (!world.renderer) {
      const parentNode = document.getElementById(parentId);
      const { clientWidth, clientHeight } = parentNode;

      const renderer = new PIXI.Renderer({
        width: clientWidth,
        height: clientHeight,
        antialias: true,
        autoDensity: true,
      });
      parentNode.appendChild(renderer.view);

      const filterStage = new PIXI.Container();

      const bloom = new AdvancedBloomFilter({
        threshold: 0.2,
        bloomScale: 1.5,
        brightness: 1.0,
        blur: 1.5,
        quality: 5,
      });

      filterStage.filters = [new PIXI.filters.FXAAFilter(), bloom];

      const stage = new PIXI.Container();
      stage.sortableChildren = true;
      filterStage.addChild(stage);

      Object.assign(world, { renderer, filterStage, bloom, stage });
    }

    const { renderer, stage, filterStage } = world;
    const { width, height } = renderer;
    const { clientWidth, clientHeight } = renderer.view.parentNode;

    let centerX = clientWidth / 2 - camera.x * zoom;
    let centerY = clientHeight / 2 - camera.y * zoom;

    stage.x = centerX;
    stage.y = centerY;
    stage.scale.x = zoom;
    stage.scale.y = zoom;

    if (clientWidth !== width || clientHeight !== height) {
      renderer.resize(clientWidth, clientHeight);
    }

    renderer.render(filterStage);

    return world;
  };

function setupTwiddles({
  title = "Twiddles",
  expanded = true,
  world,
  renderOptions,
  lifeOptions,
}) {
  const pane = new Pane();

  const f = pane.addFolder({ title, expanded });
  f.addMonitor(world, "fps", { view: "graph", min: 0, max: 65 });
  f.addInput(renderOptions, "zoom", { min: 0.1, max: 10.0 });
  f.addInput(renderOptions, "camera", {
    x: { min: -1000, max: 1000 },
    y: { min: -1000, max: 1000 },
  });
  f.addInput(lifeOptions, "stepPeriod", { min: 0.01, max: 3.0 });
  f.addSeparator();
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
