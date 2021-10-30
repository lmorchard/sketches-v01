import { pipe } from "bitecs";
import * as World from "../../../../lib/world.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { movementSystem } from "../../../../lib/positionMotion";

import {
  autoSizedRenderer,
  gridRenderer,
} from "../../../../lib/viewport/pixi.js";
import { Pane } from "tweakpane";

import {
  OraclePointerEntity,
  oraclePointerQuery,
  PointerSprite,
} from "./OraclePointer";

import {
  ORACLE_SYMBOL_AREAS,
  ORACLE_SYMBOL_LINE_1,
  ORACLE_SYMBOL_LINE_2,
  ORACLE_SYMBOL_LINE_3,
  oracleSymbolQuery,
  OracleSymbolEntity,
  OracleSymbolGlyph,
} from "./OracleSymbol";

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

const ouijaUpdateSystem = (options) => (world) => {
  const symbolEids = oracleSymbolQuery(world);
  const symbolEntity = new OracleSymbolEntity();
  for (const eid of symbolEids) {
    symbolEntity.eid = eid;
    symbolEntity.update(world);
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

  const symbolEIDs = oracleSymbolQuery(world);
  const symbolEntity = new OracleSymbolEntity();
  for (const eid of symbolEIDs) {
    symbolEntity.eid = eid;
    if (!oracleSymbolGlyphs.has(eid)) {
      const glyph = new OracleSymbolGlyph(world, symbolEntity);
      g.addChild(glyph.root());
      oracleSymbolGlyphs.set(eid, glyph);
    }
    oracleSymbolGlyphs.get(eid).update(world, symbolEntity);
  }
  for (const eid of oracleSymbolGlyphs.keys()) {
    if (!symbolEIDs.includes(eid)) {
      g.removeChild(oracleSymbolGlyphs.get(eid).root());
      oracleSymbolGlyphs.delete(eid);
      continue;
    }
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

main().catch(console.error);
