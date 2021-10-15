import {
  addEntity,
  addComponent,
  pipe,
  defineQuery,
  defineComponent,
  Types,
} from "../../../../vendor/pkg/bitecs.js";
import { hslToRgb } from "../../../../lib/hslToRgb.js";
import { lerp } from "../../../../lib/transitions.js";
import easings from "../../../../lib/easings.js";
import { rngIntRange } from "../../../../lib/randoms.js";
import {
  BaseComponentProxy,
  BaseEntityProxy,
  GenericComponentProxy,
} from "../../../../lib/ecsUtils.js";
import {
  Position,
  Velocity,
  movementSystem,
} from "../../../../lib/positionMotion.js";
import * as Stats from "../../../../lib/stats.js";
import * as World from "../../../../lib/world.js";
import * as Viewport from "../../../../lib/viewport/pixi.js";
import { setupTwiddles } from "../../../twiddles.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";

async function main() {
  const stats = Stats.init();
  const world = World.init();
  const viewport = Viewport.init();
  viewport.gridEnabled = false;

  const { pane, paneUpdateSystem } = setupTwiddles(world, viewport, false);
  const pipeline = pipe(
    movementSystem,
    perspectiveRenderingSystem({ viewport }),
    paneUpdateSystem
  );
  world.run(pipeline, viewport, stats);

  const entities = [];
  for (let idx = 0; idx < 10; idx++) {
    const entity = BuildingEntity.spawn(world, {
      Position: { x: Math.random() * 1000 - 500, y: 200, z: 1000 },
      Velocity: { x: 0, y: 0, z: Math.random() * -200 },
    });
    entities.push(entity);
  }

  Object.assign(window, {
    world,
    entities,
    Position,
    Velocity,
    PerspectiveRenderable,
  });

  console.log("READY.");
}

const PerspectiveRenderable = defineComponent({
  visible: Types.i8,
  shape: Types.i8,
  color: Types.ui32,
});

class PerspectiveRenderableProxy extends BaseComponentProxy {
  static component = PerspectiveRenderable;
}

const perspectiveRenderableQuery = defineQuery([
  PerspectiveRenderable,
  Position,
  Velocity,
]);

const camera = { x: 0, y: 0 };

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
  
      //g.moveTo(position.x, position.y);
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
