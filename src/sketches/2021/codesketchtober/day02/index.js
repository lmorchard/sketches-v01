import {
  addEntity,
  removeEntity,
  addComponent,
  pipe,
  defineQuery,
  defineComponent,
  Types,
} from "bitecs";
import { hslToRgb } from "../../../../lib/hslToRgb.js";
import { lerp } from "../../../../lib/transitions.js";
import easings from "../../../../lib/easings.js";
import { rngIntRange } from "../../../../lib/randoms.js";
import {
  BaseComponentProxy,
  BaseEntityProxy,
  GenericComponentProxy,
} from "../../../../lib/ecsUtils";
import {
  Position,
  Velocity,
  movementSystem,
} from "../../../../lib/positionMotion";
import * as Stats from "../../../../lib/stats.js";
import * as World from "../../../../lib/world.js";
import * as Viewport from "../../../../lib/viewport/pixi.js";
import { setupTwiddles } from "../../../twiddles.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";

async function main() {
  const stats = Stats.init();
  const world = World.init();
  const viewport = Viewport.init();
  viewport.gridEnabled = false;

  const { pane, paneUpdateSystem } = setupTwiddles(world, viewport, false);
  const pipeline = pipe(
    movementSystem,
    respawnBuildingSystem,
    perspectiveRenderingSystem({ viewport, perspective: 250 }),
    paneUpdateSystem
  );
  world.run(pipeline, viewport, stats);

  for (let idx = 0; idx < 200; idx++) {
    spawnRandomBuilding(world);
  }

  Object.assign(window, {
    world,
    Position,
    Velocity,
    PerspectiveRenderable,
  });

  console.log("READY.");
}

function spawnRandomBuilding(world) {
  return BuildingEntity.spawn(world, {
    Position: { x: Math.random() * 4000 - 2000, y: 300, z: 1000 },
    Velocity: { x: 0, y: 0, z: Math.random() * -1200 },
  });
}

const PerspectiveRenderable = defineComponent({
  visible: Types.i8,
  shape: Types.i8,
  color: Types.ui32,
});

const Building = defineComponent({});

class PerspectiveRenderableProxy extends BaseComponentProxy {
  static component = PerspectiveRenderable;
}

const respawnBuildingQuery = defineQuery([
  Building,
  Position,
]);

const respawnBuildingSystem = (world) => {
  const position = new PositionProxy();
  for (const eid of respawnBuildingQuery(world)) {
    position.eid = eid;
    if (position.z > -500) continue;
    removeEntity(world, eid);
    spawnRandomBuilding(world);
  }
  return world;
};

const camera = { x: 0, y: 0 };

const perspectiveRenderableQuery = defineQuery([
  PerspectiveRenderable,
  Position,
  Velocity,
]);

const perspectiveRenderingSystem =
  ({ viewport, perspective = 500 } = {}) =>
  (world) => {
    if (!world.gPerspective) {
      world.gPerspective = new Graphics();
      viewport.stage.addChild(world.gPerspective);
    }

    const { gPerspective: g } = world;

    const renderable = new PerspectiveRenderableProxy();
    const position = new PositionProxy();
    const velocity = new VelocityProxy();

    g.clear();

    g.lineStyle(1, 0x66ff66, 1);
    for (const eid of perspectiveRenderableQuery(world)) {
      renderable.eid = position.eid = velocity.eid = eid;

      const scaleProjected = perspective / (perspective + position.z);
      const x = (position.x - camera.x) * scaleProjected;
      const y = (position.y - camera.y) * scaleProjected;
  
      g.drawCircle(x, y, 50 * scaleProjected);
    }

    return world;
  };

class PositionProxy extends BaseComponentProxy {
  static component = Position;
}

class VelocityProxy extends BaseComponentProxy {
  static component = Velocity;
}

class BuildingEntity extends BaseEntityProxy {
  static components = {
    Position,
    Velocity,
    PerspectiveRenderable,
    Building,
  };
  static defaults = {
    Position: { x: 0, y: 0, z: 0, r: 0 },
    Velocity: { x: 0, y: 0, z: 0, r: 0 },
    PerspectiveRenderable: { visible: true, shape: null, color: 0x33ff33 },
  };
}

const RE_HSL = /(hsl)?\(?(\d+),\s+(\d+)%,\s+(\d+)%\)?/;
function parseHSL(hslStr) {
  const [, , ...parts] = RE_HSL.exec(hslStr);
  const [h, s, l] = parts.map((part) => parseInt(part, 10));
  return [h / 360, s / 100, l / 100];
}

const hsl = (strings, ...values) =>
  parseHSL(
    strings
      .reduce((result, string, i) => result + string + values[i], "")
      .trim()
  );

main().catch(console.error);
