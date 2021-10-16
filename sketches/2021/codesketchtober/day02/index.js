import { pipe, defineQuery, defineComponent, Types } from "../../../../vendor/pkg/bitecs.js";
import easings from "../../../../lib/easings.js";
import { lerp } from "../../../../lib/transitions.js";
import { BaseComponentProxy, BaseEntityProxy } from "../../../../lib/ecsUtils.js";
import {
  Position,
  Velocity,
  movementSystem,
} from "../../../../lib/positionMotion.js";
import * as Stats from "../../../../lib/stats.js";
import * as World from "../../../../lib/world.js";
import * as Viewport from "../../../../lib/viewport/pixi.js";
import { setupTwiddles as baseSetupTwiddles } from "../../../twiddles.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";

const NUM_BUILDINGS = 200;
const RAD_PER_DEGREE = Math.PI / 180;
const FLIGHT_SPEED = 10000;

async function main() {
  const stats = Stats.init();
  const world = World.init();

  // HACK: using a custom renderer, but borrow Pixi setup "standard" viewport
  const viewport = Viewport.init();
  viewport.gridEnabled = false;

  // TODO: move this into world?
  const renderingOptions = {
    viewport,
    horizonZ: 90000,
    fov: 90,
    camera: {
      x: 0,
      y: 0,
      roll: 0,
      sway: {
        destX: 0,
        destY: 0,
        currX: 0,
        currY: 0,
        direction: 0,
        progress: 0,
      },
    },
  };

  const { pane, paneUpdateSystem } = setupTwiddles(
    renderingOptions,
    world,
    viewport,
    false
  );

  world.run(
    pipe(
      movementSystem,
      rewindBuildingSystem({ viewport }),
      cameraSwaySystem(renderingOptions),
      perspectiveRenderingSystem(renderingOptions),
      paneUpdateSystem
    ),
    perspectiveRenderingViewport(renderingOptions),
    stats
  );

  for (let idx = 0; idx < NUM_BUILDINGS; idx++) {
    BuildingEntity.spawnRandom(world);
  }

  console.log("READY.");
}

function setupTwiddles(renderingOptions, world, viewport, expanded) {
  const { pane, paneUpdateSystem } = baseSetupTwiddles(world, viewport, false);

  pane.addInput(renderingOptions, "fov", { min: 60, max: 150 });
  pane.addInput(renderingOptions, "horizonZ", { min: 0, max: 120000 });
  pane.addInput(renderingOptions, "camera", {
    x: { min: -5000, max: 5000 },
    y: { min: -5000, max: 5000 },
  });
  pane.addInput(renderingOptions.camera, "roll", {
    min: -1.0,
    max: 1.0,
  });

  const swayFolder = pane.addFolder({ title: "Camera Sway", expanded: false });

  swayFolder.addMonitor(renderingOptions.camera.sway, "destX", {
    min: -200.0,
    max: 200.0,
  });
  swayFolder.addMonitor(renderingOptions.camera.sway, "destY", {
    min: -200.0,
    max: 200.0,
  });
  swayFolder.addMonitor(renderingOptions.camera.sway, "currX", {
    min: -200.0,
    max: 200.0,
  });
  swayFolder.addMonitor(renderingOptions.camera.sway, "currY", {
    min: -200.0,
    max: 200.0,
  });
  swayFolder.addMonitor(renderingOptions.camera.sway, "progress", {
    min: -1.0,
    max: 1.0,
  });
  swayFolder.addMonitor(renderingOptions.camera.sway, "direction", {
    min: -1.0,
    max: 1.0,
  });

  return { pane, paneUpdateSystem };
}

const cameraSwaySystem =
  (options = {}) =>
  (world) => {
    const {
      camera,
      magnitudeX = 12000,
      magnitudeY = 4000,
      rollFactor = 500,
      maxRoll = 0.2,
      minRoll = -0.2,
      speed = 0.5,
    } = options;
    const { sway } = camera;

    const {
      time: { deltaSec },
    } = world;

    if (sway.direction === 0) {
      sway.destX = magnitudeX / 2 - Math.random() * magnitudeX;
      sway.destY = magnitudeY / 2 - Math.random() * magnitudeY;
      sway.direction = 1;
      sway.progress = 0;
    }

    sway.progress += deltaSec * sway.direction * speed;

    if (sway.progress >= 1) {
      sway.progress = 1;
      sway.direction = -1;
    }
    if (sway.progress <= 0) {
      sway.progress = 0;
      sway.direction = 0;
    }

    if (sway.direction !== 0) {
      const easing = easings.easeInOutSine;
      sway.currX = lerp(0, sway.destX, easing(sway.progress));

      // TODO: add roll based on direction and change in X
      const xDiff = camera.x - sway.currX;
      camera.roll = Math.min(maxRoll, Math.max(minRoll, xDiff / rollFactor));

      camera.x = sway.currX;
      camera.y = sway.currY = lerp(0, sway.destY, easing(sway.progress));
    }

    return world;
  };

class PositionProxy extends BaseComponentProxy {
  static component = Position;
}

const PerspectiveRenderable = defineComponent({
  visible: Types.i8,
  shape: Types.i8,
  color: Types.ui32,
  width: Types.f32,
  height: Types.f32,
  screenX: Types.f32,
  screenY: Types.f32,
  screenWidth: Types.f32,
  screenHeight: Types.f32,
});

class PerspectiveRenderableProxy extends BaseComponentProxy {
  static component = PerspectiveRenderable;
}

// Just a "tag" component for rewindBuildingSystem
const Building = defineComponent({});

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

  static randomPosition = () => ({
    x: Math.floor(Math.random() * 45) * 1000 * (Math.random() > 0.5 ? -1 : 1),
    y: 4000,
    z: Math.floor(Math.random() * 10) * 10000,
  });

  static spawnRandom(world) {
    // Get a width & height that's always taller than wide.
    const [width, height] = [
      500 + Math.floor(Math.random() * 250) * 10,
      500 + Math.floor(Math.random() * 250) * 10,
    ].sort((a, b) => a - b);

    return this.spawn(world, {
      Position: this.randomPosition(),
      Velocity: { x: 0, y: 0, z: 0 - FLIGHT_SPEED },
      PerspectiveRenderable: { visible: true, width, height },
    });
  }
}

const rewindBuildingQuery = defineQuery([Building, Position]);

// System that moves buildings back to the horizon when out of sight.
const rewindBuildingSystem =
  (options = {}) =>
  (world) => {
    const { viewport } = options;
    const { width, height } = viewport.renderer;
    const halfWidth = width / 2;

    const position = new PositionProxy();
    const renderable = new PerspectiveRenderableProxy();

    for (const eid of rewindBuildingQuery(world)) {
      position.eid = renderable.eid = eid;

      // If the position is in front of us and still on-screen, skip.
      if (
        position.z > 0 &&
        renderable.screenX < halfWidth + renderable.width &&
        renderable.screenX > 0 - halfWidth - renderable.width
      ) {
        continue;
      }

      // Move this building to a random spot in the back to make another trip
      Object.assign(position, {
        ...BuildingEntity.randomPosition(),
        z: 100000 - Math.floor(Math.random() * 10) * 1000,
      });
    }
    return world;
  };

const perspectiveRenderableQuery = defineQuery([
  PerspectiveRenderable,
  Position,
  Velocity,
]);

const perspectiveRenderingSystem =
  (options = {}) =>
  (world) => {
    const { viewport, fov, camera } = options;

    // HACK: reuse the "standard" viewport logic to update width / height
    viewport.updateViewportBounds(world);
    const { width, height } = viewport.renderer;

    const renderable = new PerspectiveRenderableProxy();
    const position = new PositionProxy();

    // Commence the fancy trigonometry to figure out the perspective scaling!
    // This is a right-triangle where the angle opposite the perpendicular
    // is 1/2 the Field-of-View.
    const tan = Math.tan((fov / 2) * RAD_PER_DEGREE);

    // Finding the Z distance where half the screen width fits into the
    // triangle (i.e. the adjacent leg) tells us how far the camera lies
    // in the triangle, forming the near plane of the viewing frustrum.
    // https://en.wikipedia.org/wiki/Viewing_frustum
    const halfWidth = width / 2;
    const cameraZ = halfWidth / tan;

    // TODO: work this out also for height?

    for (const eid of perspectiveRenderableQuery(world)) {
      // Set the access proxies to deal with this entity.
      renderable.eid = position.eid = eid;

      // Camera is at Z=0, so anything in the negative is behind us and
      // can be skipped for rendering.
      if (position.z < 0) continue;

      // Adding the Z positions of camera and renderable gives us the
      // length of the adjacent leg of the perspective triangle - i.e.
      // the far plane of the viewing frustrum.
      const adjacent = cameraZ + position.z;

      // Knowing the adjacent leg, we can use the tangent ratio to find
      // the width of the opposite leg at the renderable's Z distance.
      const opposite = tan * adjacent;

      // And finally, knowing the widths of the near and far planes of the
      // viewing frustrum, we can come up with a perspective scaling factor
      // for the renderable.
      const perspectiveScale = halfWidth / opposite;

      // Come up with the screen coordinates for the renderable, accounting
      // for camera position, and scaled appropriately
      renderable.screenX = (position.x - camera.x) * perspectiveScale;
      renderable.screenY = (position.y - camera.y) * perspectiveScale;

      // If the position is horizontally off-screen, skip further rendering.
      if (
        renderable.screenX > halfWidth + renderable.width ||
        renderable.screenX < 0 - halfWidth - renderable.width
      ) {
        continue;
      }

      // Scale the renderable itself as apropriate
      renderable.screenWidth = renderable.width * perspectiveScale;
      renderable.screenHeight = renderable.height * perspectiveScale;
    }

    return world;
  };

const perspectiveRenderingViewport = (options = {}) => ({
  draw(world) {
    const {
      viewport,
      camera,
      horizonZ,
      horizonEasing = easings.easeOutQuart,
    } = options;

    // Get our graphics context, creating if necessary.
    const { stage } = viewport;
    if (!world.gPerspective) {
      world.gPerspective = new Graphics();
      stage.addChild(world.gPerspective);
      world.gHud = new Graphics();
      stage.addChild(world.gHud);
    }
    const { gPerspective: g, gHud } = world;

    gHud.clear();
    gHud.lineStyle(3, 0x99ff99, 0.6);
    gHud.moveTo(-50, -100);
    gHud.lineTo(50, -100);
    gHud.moveTo(-25, -50);
    gHud.lineTo(25, -50);
    gHud.moveTo(-100, 0);
    gHud.lineTo(100, 0);
    gHud.moveTo(-25, 50);
    gHud.lineTo(25, 50);
    gHud.moveTo(-50, 100);
    gHud.lineTo(50, 100);

    const renderable = new PerspectiveRenderableProxy();
    const position = new PositionProxy();
    const position2 = new PositionProxy();

    // Depth-sort the renderable entities so the ones in front obscure the ones in back
    const renderableEids = perspectiveRenderableQuery(world);
    renderableEids.sort((aEid, bEid) => {
      position.eid = aEid;
      position2.eid = bEid;
      return position2.z - position.z;
    });

    g.clear();    
    g.rotation = camera.roll;

    for (const eid of renderableEids) {
      position.eid = renderable.eid = eid;

      // Fade out the lines close to the horizon, to finesse pop-in
      const alpha = horizonEasing((horizonZ - position.z) / horizonZ);
      g.lineStyle(1, 0x66ff66, alpha);

      // TODO: thought about fading out the fill, but that just made
      // them transparent. Would need more of a global distance fog effect.
      g.beginFill(0x000000);

      // Finally, draw our renderable shape.
      /// TODO: support more shapes than just rectangles?
      const { screenX, screenY, screenWidth, screenHeight } = renderable;
      g.drawRect(
        screenX - screenWidth / 2,
        screenY - screenHeight,
        screenWidth,
        screenHeight
      );
    }

    // HACK: finish rendering the frame with "standard" viewport
    viewport.render();
  },
});

main().catch(console.error);
