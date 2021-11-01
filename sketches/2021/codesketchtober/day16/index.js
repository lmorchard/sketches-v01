import { pipe } from "../../../../vendor/pkg/bitecs.js";
import * as World from "../../../../lib/world.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";
import { movementSystem } from "../../../../lib/positionMotion.js";

import {
  autoSizedRenderer,
  gridRenderer,
} from "../../../../lib/viewport/pixi.js";
import { Pane } from "../../../../vendor/pkg/tweakpane.js";

import {
  OraclePointerEntity,
  oraclePointerQuery,
  OraclePointerSprite,
} from "./OraclePointer.js";

import {
  ORACLE_SYMBOL_AREAS,
  ORACLE_SYMBOL_LINE_1,
  ORACLE_SYMBOL_LINE_2,
  ORACLE_SYMBOL_LINE_3,
  oracleSymbolQuery,
  OracleSymbolEntity,
  OracleSymbolGlyph,
} from "./OracleSymbol.js";

import {
  magicCircleQuery,
  MagicCircleEntity,
  MagicCircleSprite,
} from "./MagicCircle.js";

const MAGIC_CIRCLE_COUNT = 14;

async function main() {
  const world = World.init();

  const renderOptions = {};

  const { pane, paneUpdateSystem } = setupTwiddles({ world });

  world.run(
    pipe(ouijaUpdateSystem(), movementSystem, paneUpdateSystem),
    pipe(
      autoSizedRenderer(renderOptions),
      ouijaRenderer(renderOptions),
      gridRenderer()
    )
  );

  OraclePointerEntity.spawn(world);

  for (let idx = 0; idx < MAGIC_CIRCLE_COUNT; idx++) {
    const m = MagicCircleEntity.spawn(world, {
      MagicCircle: {
        row: idx % 2,
        col: Math.floor(idx / 2),
        count: MAGIC_CIRCLE_COUNT,
      },
    });
  }

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
  const updates = [
    [magicCircleQuery, MagicCircleEntity],
    [oracleSymbolQuery, OracleSymbolEntity],
    [
      oraclePointerQuery,
      OraclePointerEntity,
      (pointerEntity) => {
        if (!pointerEntity.OraclePointer.moveActive) {
          pointerEntity.setTarget(
            symbolEids[Math.floor(Math.random() * symbolEids.length)]
          );
        }
      },
    ],
  ];
  for (const [query, Entity, customUpdate = () => {}] of updates) {
    const eids = query(world);
    const entity = new Entity();
    for (const eid of eids) {
      entity.eid = eid;
      customUpdate(entity);
      entity.update(world);
    }
  } 
  return world;
};

const ouijaRendererInit = (world) => {
  const { stage } = world;
  const g = (world.gOuija = new Graphics());
  stage.addChild(world.gOuija);
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

  const spriteUpdates = [
    [
      magicCircleQuery,
      MagicCircleEntity,
      MagicCircleSprite,
      "magicCircleSprites",
    ],
    [
      oraclePointerQuery,
      OraclePointerEntity,
      OraclePointerSprite,
      "oraclePointerSprites",
    ],
    [
      oracleSymbolQuery,
      OracleSymbolEntity,
      OracleSymbolGlyph,
      "oracleSymbolSprites",
    ],
  ];
  for (const [query, Entity, Sprite, spriteMapName] of spriteUpdates) {
    if (!world[spriteMapName]) {
      world[spriteMapName] = new Map();
    }
    const spriteMap = world[spriteMapName];
    const eids = query(world);
    const entity = new Entity();
    for (const eid of eids) {
      entity.eid = eid;
      if (!spriteMap.has(eid)) {
        const sprite = new Sprite(world, entity);
        g.addChild(sprite.root());
        spriteMap.set(eid, sprite);
      }
      spriteMap.get(eid).update(world, entity, eids);
    }
    for (const eid of spriteMap.keys()) {
      if (!eids.includes(eid)) {
        g.removeChild(spriteMap.get(eid).root());
        spriteMap.delete(eid);
      }
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
