import { pipe, defineQuery, defineComponent, Types } from "bitecs";
import easings from "../../../../lib/easings.js";
import { lerp } from "../../../../lib/transitions.js";
import * as World from "../../../../lib/world.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { BaseComponentProxy, BaseEntityProxy } from "../../../../lib/ecsUtils";
import {
  Position,
  Velocity,
  movementSystem,
} from "../../../../lib/positionMotion";

import { autoSizedRenderer } from "../../../../lib/viewport/pixi.js";
import { Pane } from "tweakpane";

import FontFutural from "../../../../fonts/futural.json";
// import FontFuturam from "../../../../fonts/futuram.json";
// import FontScripts from "../../../../fonts/scripts.json";
// import FontScriptc from "../../../../fonts/scriptc.json";
// import FontRowmant from "../../../../fonts/rowmant.json";

const ORACLE_SYMBOL_LINE_1 = "ABCDEFGHIJKLM";
const ORACLE_SYMBOL_LINE_2 = "NOPQRSTUVWXYZ";
const ORACLE_SYMBOL_LINE_3 = "0123456789";

const ORACLE_SYMBOL_AREAS = ["LINE_1", "LINE_2", "LINE_3"].reduce(
  (a, n, i) => ({ ...a, [n]: i }),
  {}
);

async function main() {
  const world = World.init();

  const renderOptions = {};

  const { pane, paneUpdateSystem } = setupTwiddles({
    world,
  });

  world.run(
    pipe(ouijaUpdateSystem(), movementSystem, paneUpdateSystem),
    pipe(
      autoSizedRenderer(renderOptions),
      ouijaRenderer(renderOptions),
      gridRenderer()
    )
  );

  for (let [line, area] of [
    [ORACLE_SYMBOL_LINE_1, ORACLE_SYMBOL_AREAS.LINE_1],
    [ORACLE_SYMBOL_LINE_2, ORACLE_SYMBOL_AREAS.LINE_2],
    [ORACLE_SYMBOL_LINE_3, ORACLE_SYMBOL_AREAS.LINE_3],
  ]) {
    for (let idx = 0; idx < line.length; idx++) {
      OracleSymbolEntity.spawn(world, {
        OracleSymbol: {
          char: line.charCodeAt(idx),
          order: idx,
          area,
        },
      });
    }
  }

  console.log("READY.");
}

class PositionProxy extends BaseComponentProxy {
  static component = Position;
}

const OracleSymbol = defineComponent({
  char: Types.ui8,
  area: Types.ui8,
  order: Types.ui8,
});

const oracleSymbolQuery = defineQuery([Position, Velocity, OracleSymbol]);

class OracleSymbolEntity extends BaseEntityProxy {
  static components = {
    Position,
    Velocity,
    OracleSymbol,
  };
  static defaults = {
    Position: { x: 0, y: 0 },
    Velocity: { x: 0, y: 0 },
    OracleSymbol: {
      char: "A",
    },
  };
}

const ouijaUpdateSystem = (options) => (world) => {
  const {
    renderer: { width, height },
  } = world;

  const entity = new OracleSymbolEntity();
  for (const eid of oracleSymbolQuery(world)) {
    entity.eid = eid;
    const { area, order } = entity.OracleSymbol;
    switch (area) {
      case ORACLE_SYMBOL_AREAS.LINE_1: {
        const count = ORACLE_SYMBOL_LINE_1.length;
        /*
        const radius = 2200;
        const cy = 1900;
        const cx = 0;
        const startT = (0 - Math.PI * 0.5) - Math.PI / 13;
        const endT = (0 - Math.PI * 0.5) + Math.PI / 13;
        const stepT = (endT - startT) / count;
        const t = startT + stepT * order;
        entity.Position.x = cx + Math.cos(t) * radius;
        entity.Position.y = cy + Math.sin(t) * radius;
        */
        const startY = 0 - (height / 2.0) * 0.4;
        const startX = 0 - (width / 2.0) * 0.8;
        const endX = (width / 2.0) * 0.8;
        const stepX = (endX - startX) / (count - 1);
        entity.Position.x = startX + stepX * order;
        entity.Position.y = startY;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_2: {
        const count = ORACLE_SYMBOL_LINE_2.length;
        /*
        const radius = 2200;
        const cy = 2050;
        const cx = 0;
        const startT = (0 - Math.PI * 0.5) - Math.PI / 13;
        const endT = (0 - Math.PI * 0.5) + Math.PI / 13;
        const stepT = (endT - startT) / count;
        const t = startT + stepT * order;
        entity.Position.x = cx + Math.cos(t) * radius;
        entity.Position.y = cy + Math.sin(t) * radius;
        */
        const startY = 0 - (height / 2.0) * 0.1;
        const startX = 0 - (width / 2.0) * 0.8;
        const endX = (width / 2.0) * 0.8;
        const stepX = (endX - startX) / (count - 1);
        entity.Position.x = startX + stepX * order;
        entity.Position.y = startY;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_3: {
        const count = ORACLE_SYMBOL_LINE_3.length;
        const startY = (height / 2.0) * 0.33;
        const startX = 0 - (width / 2.0) * 0.5;
        const endX = (width / 2.0) * 0.5;
        const stepX = (endX - startX) / (count - 1);
        entity.Position.x = startX + stepX * order;
        entity.Position.y = startY;
        break;
      }
    }
  }
  return world;
};

const ouijaRendererInit = (world) => {
  const { stage } = world;

  const g = (world.gOuija = new Graphics());
  stage.addChild(world.gOuija);

  world.oracleSymbolGlyphs = new Map();
};

const ouijaRenderer = (options) => (world) => {
  const {
    stage,
    renderer: { width, height },
  } = world;

  if (!world.gOuija) {
    ouijaRendererInit(world);
  }

  const { gOuija: g, oracleSymbolGlyphs } = world;

  g.clear();
  g.lineStyle(2, 0x33ff33, 1.0);

  const entityIds = oracleSymbolQuery(world);
  for (const eid of entityIds) {
    if (!oracleSymbolGlyphs.has(eid)) {
      const char = String.fromCharCode(OracleSymbol.char[eid]);
      const glyph = renderGlyph(FontFutural, char);
      oracleSymbolGlyphs.set(eid, glyph);
      g.addChild(glyph);
    }
  }

  for (const eid of oracleSymbolGlyphs.keys()) {
    if (!entityIds.includes(eid)) {
      oracleSymbolGlyphs.delete(eid);
      continue;
    }
    const glyph = oracleSymbolGlyphs.get(eid);
    glyph.x = Position.x[eid];
    glyph.y = Position.y[eid];
    glyph.scale.x = 2.0;
    glyph.scale.y = 2.0;
  }

  return world;
};

const gridRendererInit = (world) => {
  const { stage } = world;
  world.gGrid = new Graphics();
  stage.addChild(world.gGrid);
};

const gridRenderer = (options = {}) => (world) => {
  const {
    gridSize = 50,
    gridLineWidth = 2.0,
    gridLineColor = 0xffffff,
    gridLineAlpha = 0.05,
    zoom = 1.0,
    camera = { x: 0, y: 0 },    
  } = options;

  if (!world.gGrid) {
    gridRendererInit(world);
  }

  const {
    gGrid: g,
    renderer: { width, height },
  } = world;

  g.clear();

  const lineWidth = gridLineWidth; // 2 * (1 / zoom);

  const visibleWidth = Math.floor(width / zoom);
  const visibleHeight = Math.floor(height / zoom);
  const visibleLeft = 0 - visibleWidth / 2 + camera.x;
  const visibleTop = 0 - visibleHeight / 2 + camera.y;

  const gridOffsetX = Math.abs(visibleLeft % gridSize);
  const gridOffsetY = Math.abs(visibleTop % gridSize);

  const xStart = visibleLeft + gridOffsetX;
  const xEnd = xStart + visibleWidth + gridOffsetX;
  const yStart = visibleTop + gridOffsetY;
  const yEnd = yStart + visibleHeight + gridOffsetY;

  g.lineStyle(lineWidth, gridLineColor, gridLineAlpha);
  for (let x = xStart; x < xEnd; x += gridSize) {
    g.moveTo(x, visibleTop);
    g.lineTo(x, visibleTop + visibleHeight);
  }
  for (let y = yStart; y < yEnd; y += gridSize) {
    g.moveTo(visibleLeft, y);
    g.lineTo(visibleLeft + visibleWidth, y);
  }
};

function setupTwiddles({ title = document.title, expanded = false, world }) {
  const pane = new Pane();

  const f = pane.addFolder({ title, expanded });

  return {
    pane,
    paneUpdateSystem: (world) => {
      pane.refresh();
      return world;
    },
  };
}

const glyphCache = new Map();
function renderGlyph(font, char) {
  const cacheKey = `${font.name}:${char}`;
  if (!glyphCache.has(cacheKey)) {
    const glyph = font.glyphs[char];
    const g = new Graphics();
    g.lineStyle(2, 0xffaa33, 1);
    for (const line of glyph.lines) {
      if (line.length === 0) continue;
      g.moveTo(line[0][0], line[0][1]);
      for (let lineIdx = 1; lineIdx < line.length; lineIdx++) {
        g.lineTo(line[lineIdx][0], line[lineIdx][1]);
      }
    }
    glyphCache.set(cacheKey, g);
  }
  return glyphCache.get(cacheKey).clone();
}

main().catch(console.error);
