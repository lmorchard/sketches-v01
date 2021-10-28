import { pipe, defineQuery, defineComponent, Types } from "../../../../vendor/pkg/bitecs.js";
import easings from "../../../../lib/easings.js";
import { lerp } from "../../../../lib/transitions.js";
import * as World from "../../../../lib/world.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";
import { BaseComponentProxy, BaseEntityProxy } from "../../../../lib/ecsUtils.js";
import {
  Position,
  Velocity,
  movementSystem,
} from "../../../../lib/positionMotion.js";

import { autoSizedRenderer } from "../../../../lib/viewport/pixi.js";
import { Pane } from "../../../../vendor/pkg/tweakpane.js";

import FontFutural from "../../../../fonts/futural.json.proxy.js";
//import FontFuturam from "../../../../fonts/futuram.json";
//import FontScripts from "../../../../fonts/scripts.json";
//import FontScriptc from "../../../../fonts/scriptc.json";
//import FontRowmant from "../../../../fonts/rowmant.json";

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
    pipe(autoSizedRenderer(renderOptions), ouijaRenderer(renderOptions))
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
    let startY, startX, endX, stepX;
    const { area, order } = entity.OracleSymbol;
    switch (area) {
      case ORACLE_SYMBOL_AREAS.LINE_1: {
        const count = ORACLE_SYMBOL_LINE_1.length;
        const radius = 100;
        const cx = 0;
        const cy = 0 - (height / 2.0) * 0.66;
        const t = (0 - Math.PI) + (Math.PI) * (order / (count - 1));
        entity.Position.x = cx + Math.cos(t) * radius;
        entity.Position.y = cy + Math.sin(t) * radius;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_2: {
        const count = ORACLE_SYMBOL_LINE_2.length;
        const radius = 100;
        const cx = 0;
        const cy = 0 - (height / 2.0) * 0.33;
        const t = (0 - Math.PI) + (Math.PI) * (order / (count - 1));
        entity.Position.x = cx + Math.cos(t) * radius;
        entity.Position.y = cy + Math.sin(t) * radius;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_3: {
        startY = (height / 2.0) * 0.33;
        startX = 0 - (width / 2.0) * 0.5;
        endX = (width / 2.0) * 0.5;
        stepX = (endX - startX) / ORACLE_SYMBOL_LINE_3.length;
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
