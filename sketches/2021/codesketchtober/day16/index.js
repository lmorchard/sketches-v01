import { pipe, defineQuery, defineComponent, Types } from "../../../../vendor/pkg/bitecs.js";
import Easings from "../../../../lib/easings.js";
import { lerp, transition } from "../../../../lib/transitions.js";
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
// import FontFuturam from "../../../../fonts/futuram.json";
// import FontScripts from "../../../../fonts/scripts.json";
// import FontScriptc from "../../../../fonts/scriptc.json";
// import FontRowmant from "../../../../fonts/rowmant.json";

const ORACLE_SYMBOL_LINE_1 = "ABCDEFGHIJKLM";
const ORACLE_SYMBOL_LINE_2 = "NOPQRSTUVWXYZ";
const ORACLE_SYMBOL_LINE_3 = "0123456789";

const ORACLE_SYMBOL_AREAS = {
  LINE_1: 1,
  LINE_2: 2,
  LINE_3: 3,
};

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

  OraclePointerEntity.spawn(world, {
    Position: { x: 0, y: 0 },
  });

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
}

const OraclePointer = defineComponent({
  targetSymbol: Types.eid,
  moveActive: Types.ui8,
  moveFromX: Types.f32,
  moveFromY: Types.f32,
  moveToX: Types.f32,
  moveToY: Types.f32,
  moveDuration: Types.f32,
  moveElapsed: Types.f32,
});

const oraclePointerQuery = defineQuery([Position, Velocity, OraclePointer]);

class OraclePointerEntity extends BaseEntityProxy {
  static components = {
    Position,
    Velocity,
    OraclePointer,
  };

  setTarget(eid, duration = 1500.0) {
    this.OraclePointer.targetSymbol = eid;
    this.OraclePointer.moveActive = 1;
    this.OraclePointer.moveFromX = this.Position.x;
    this.OraclePointer.moveFromY = this.Position.y;
    this.OraclePointer.moveToX = Position.x[eid];
    this.OraclePointer.moveToY = Position.y[eid];
    this.OraclePointer.moveElapsed = 0.0;
    this.OraclePointer.moveDuration = duration;
  }

  update(world) {
    if (!this.OraclePointer.moveActive) return;

    const {
      OraclePointer: { targetSymbol },
    } = this;
    this.OraclePointer.moveToX = Position.x[targetSymbol];
    this.OraclePointer.moveToY = Position.y[targetSymbol];

    const {
      OraclePointer: {
        moveFromX,
        moveFromY,
        moveToX,
        moveToY,
        moveDuration,
        moveElapsed,
      },
    } = this;

    const moveEase = Easings.easeInOutExpo;

    this.Position.x = transition(
      moveFromX,
      moveToX,
      moveDuration,
      moveElapsed,
      moveEase
    );

    this.Position.y = transition(
      moveFromY,
      moveToY,
      moveDuration,
      moveElapsed,
      moveEase
    );

    this.OraclePointer.moveElapsed += world.time.delta;
    if (this.OraclePointer.moveElapsed >= moveDuration) {
      this.OraclePointer.moveActive = 0;
      this.Position.x = this.OraclePointer.moveToX;
      this.Position.y = this.OraclePointer.moveToY;
    }
  }
}

class PointerSprite {
  static defaultOptions = {
    reticuleRadius: 55,
    reticuleInnerRadius: 40,
  };

  constructor(world, pointerEntity, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };
    const { reticuleRadius, reticuleInnerRadius } = this.options;

    const g = new Graphics();

    const gLines = new Graphics();
    g.addChild(gLines);

    const gReticule = new Graphics();
    g.addChild(gReticule);

    gReticule.lineStyle(2, 0x33ff33, 1);
    gReticule.drawCircle(0, 0, reticuleInnerRadius);
    gReticule.drawCircle(0, 0, reticuleRadius);

    Object.assign(this, { g, gReticule, gLines });
  }

  root() {
    return this.g;
  }

  update(world, pointerEntity) {
    const { gReticule, gLines, options } = this;
    const { reticuleRadius, reticuleInnerRadius } = options;
    const {
      Position: { x, y },
    } = pointerEntity;
    const {
      renderer: { width, height },
    } = world;

    gReticule.x = x;
    gReticule.y = y;

    gLines.clear();
    gLines.lineStyle(2, 0x33ff33, 1);

    const xr = width / 2;
    const xl = 0 - xr;
    const yb = height / 2;
    const yt = 0 - yb;

    gLines.moveTo(xl, y);
    gLines.lineTo(x - reticuleRadius, y);
    gLines.moveTo(xr, y);
    gLines.lineTo(x + reticuleRadius, y);
    gLines.moveTo(x, yt);
    gLines.lineTo(x, y - reticuleRadius);
    gLines.moveTo(x, yb);
    gLines.lineTo(x, y + reticuleRadius);
  }
}

const ouijaUpdateSystem = (options) => (world) => {
  const {
    renderer: { width, height },
  } = world;

  const symbolEids = oracleSymbolQuery(world);
  const symbolEntity = new OracleSymbolEntity();
  for (const eid of symbolEids) {
    symbolEntity.eid = eid;
    const { area, order } = symbolEntity.OracleSymbol;
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
        symbolEntity.Position.x = startX + stepX * order;
        symbolEntity.Position.y = startY;
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
        symbolEntity.Position.x = startX + stepX * order;
        symbolEntity.Position.y = startY;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_3: {
        const count = ORACLE_SYMBOL_LINE_3.length;
        const startY = (height / 2.0) * 0.33;
        const startX = 0 - (width / 2.0) * 0.5;
        const endX = (width / 2.0) * 0.5;
        const stepX = (endX - startX) / (count - 1);
        symbolEntity.Position.x = startX + stepX * order;
        symbolEntity.Position.y = startY;
        break;
      }
    }
  }

  const pointerEntity = new OraclePointerEntity();
  for (const eid of oraclePointerQuery(world)) {
    pointerEntity.eid = eid;
    if (!pointerEntity.OraclePointer.moveActive) {
      pointerEntity.setTarget(
        symbolEids[Math.floor(Math.random() * symbolEids.length)]
      );
    }
    pointerEntity.update(world);
  }

  return world;
};

const ouijaRendererInit = (world) => {
  const { stage } = world;

  const g = (world.gOuija = new Graphics());
  stage.addChild(world.gOuija);

  world.oracleSymbolGlyphs = new Map();
  world.oraclePointerSprites = new Map();
};

const ouijaRenderer = (options) => (world) => {
  const {
    stage,
    renderer: { width, height },
  } = world;

  if (!world.gOuija) {
    ouijaRendererInit(world);
  }

  const { gOuija: g, oracleSymbolGlyphs, oraclePointerSprites } = world;

  g.clear();

  const pointerEIDs = oraclePointerQuery(world);
  const pointerEntity = new OraclePointerEntity();
  for (const eid of pointerEIDs) {
    pointerEntity.eid = eid;
    if (!oraclePointerSprites.has(eid)) {
      const sprite = new PointerSprite(world, pointerEntity);
      g.addChild(sprite.root());
      oraclePointerSprites.set(eid, sprite);
    }
    oraclePointerSprites.get(eid).update(world, pointerEntity);
  }
  for (const eid of oraclePointerSprites.keys()) {
    if (!pointerEIDs.includes(eid)) {
      g.removeChild(oraclePointerSprites.get(eid).root());
      oraclePointerSprites.delete(eid);
    }
  }

  // Ensure all existing symbols have a corresponding graphic rendering
  const symbolEIDs = oracleSymbolQuery(world);
  for (const eid of symbolEIDs) {
    if (!oracleSymbolGlyphs.has(eid)) {
      const char = String.fromCharCode(OracleSymbol.char[eid]);
      const glyph = renderGlyph(FontFutural, char);
      oracleSymbolGlyphs.set(eid, glyph);
      g.addChild(glyph);
    }
  }
  for (const eid of oracleSymbolGlyphs.keys()) {
    if (!symbolEIDs.includes(eid)) {
      // Remove any symbols that have departed
      g.removeChild(oracleSymbolGlyphs.get(eid).root);
      oracleSymbolGlyphs.delete(eid);
      continue;
    }
    // Update all the existing symbols' position & size
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

const gridRenderer =
  (options = {}) =>
  (world) => {
    const {
      gridSize = 50,
      gridLineWidth = 2.0,
      gridLineColor = 0xffffff,
      gridLineAlpha = 0.1,
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
