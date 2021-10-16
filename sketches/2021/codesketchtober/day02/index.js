import { pipe, defineQuery, defineComponent, Types } from "../../../../vendor/pkg/bitecs.js";
import easings from "../../../../lib/easings.js";
import { BaseComponentProxy, BaseEntityProxy } from "../../../../lib/ecsUtils.js";
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

const NUM_BUILDINGS = 200;

async function main() {
  const stats = Stats.init();
  const world = World.init();
  const viewport = Viewport.init();
  viewport.gridEnabled = false;

  const { pane, paneUpdateSystem } = setupTwiddles(world, viewport, false);

  const renderingOptions = {
    viewport,
    fov: 90,
    horizonZ: 90000,
    camera: { x: 0, y: 0 },
  };
  pane.addInput(renderingOptions, "fov", { min: 60, max: 150 });
  pane.addInput(renderingOptions, "camera", {
    x: { min: -5000, max: 5000 },
    y: { min: -5000, max: 5000 },
  });

  const pipeline = pipe(
    movementSystem,
    rewindBuildingSystem,
    perspectiveRenderingSystem(renderingOptions),
    paneUpdateSystem
  );
  world.run(pipeline, viewport, stats);

  for (let idx = 0; idx < NUM_BUILDINGS; idx++) {
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

const randomBuildingPosition = () => ({
  x: Math.random() * 50000 - 25000,
  y: 2000,
  z: Math.random() * 100000,
});

function spawnRandomBuilding(world) {
  const dimensions = [
    500 + Math.random() * 1000,
    1000 + Math.random() * 1000,
  ];
  dimensions.sort();
  const [width, height] = dimensions;
  return BuildingEntity.spawn(world, {
    Position: randomBuildingPosition(),
    Velocity: { x: 0, y: 0, z: -5000 },
    Building: { width, height, },
  });
}

const PerspectiveRenderable = defineComponent({
  visible: Types.i8,
  shape: Types.i8,
  color: Types.ui32,
});

const Building = defineComponent({
  width: Types.f32,
  height: Types.f32,
});

class PerspectiveRenderableProxy extends BaseComponentProxy {
  static component = PerspectiveRenderable;
}

const rewindBuildingQuery = defineQuery([Building, Position]);

const rewindBuildingSystem = (world) => {
  const position = new PositionProxy();
  for (const eid of rewindBuildingQuery(world)) {
    position.eid = eid;
    if (position.z > 0) continue;
    Object.assign(position, { ...randomBuildingPosition(), z: 100000 });
  }
  return world;
};

const perspectiveRenderableQuery = defineQuery([
  PerspectiveRenderable,
  Position,
  Velocity,
]);

const RAD_PER_DEGREE = Math.PI / 180;

const perspectiveRenderingSystem =
  (options = {}) =>
  (world) => {
    const {
      viewport,
      fov,
      camera,
      horizonZ,
      horizonEasing = easings.easeOutQuart,
    } = options;

    if (!world.gPerspective) {
      world.gPerspective = new Graphics();
      viewport.stage.addChild(world.gPerspective);
    }

    const { gPerspective: g } = world;
    const {
      renderer: { width, height },
    } = viewport;

    const tan = Math.tan((fov / 2) * RAD_PER_DEGREE);
    const cameraPlaneZ = width / tan;

    const renderable = new PerspectiveRenderableProxy();
    const position = new PositionProxy();
    const position2 = new PositionProxy();
    const velocity = new VelocityProxy();
    const building = new BuildingProxy();

    const entity = new BuildingEntity();

    g.clear();

    const renderableEids = perspectiveRenderableQuery(world);
    renderableEids.sort((aEid, bEid) => {
      position.eid = aEid;
      position2.eid = bEid;
      return position2.z - position.z;
    });

    for (const eid of renderableEids) {
      entity.eid = eid;
      renderable.eid = position.eid = velocity.eid = building.eid = eid;

      if (position.z < 0) continue;

      const adjacent = position.z + cameraPlaneZ;
      const opposite = tan * adjacent;
      const scaleProjected = width / opposite;

      const x = (position.x - camera.x) * scaleProjected;
      const y = (position.y - camera.y) * scaleProjected;

      const bWidth = building.width * scaleProjected;
      const bHeight = building.height * scaleProjected;

      const alpha = horizonEasing((horizonZ - position.z) / horizonZ); // Fade out toward the horizon
      g.lineStyle(1, 0x66ff66, alpha);
      g.beginFill(0x000000);
      g.drawRect(x - bWidth / 2, y - bHeight, bWidth, bHeight);
    }

    return world;
  };

class PositionProxy extends BaseComponentProxy {
  static component = Position;
}

class VelocityProxy extends BaseComponentProxy {
  static component = Velocity;
}

class BuildingProxy extends BaseComponentProxy {
  static component = Building;
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
