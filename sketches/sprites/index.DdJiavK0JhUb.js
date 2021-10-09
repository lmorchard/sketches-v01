import { addEntity, addComponent, pipe, removeComponent } from "../../vendor/pkg/bitecs.NAhENCKzJOVt.js";
import * as Stats from "../../lib/stats.kmT9S2XHaHWD.js";
import * as World from "../../lib/world.LNwdjn2kAWyp.js";
import * as Viewport from "../../lib/viewport/pixi.h5vEDTNcChhr.js";
import {
  CameraFocus,
  RenderableShape,
  RenderableShapes,
  Renderable,
  renderQuery,
  cameraFocusQuery,
} from "../../lib/viewport/index.CpZuvs6nLZ_y.js";
import {
  movementSystem,
  Position,
  Velocity,
} from "../../lib/positionMotion.l-PS2cXo6TSL.js";
import { setupTwiddles } from "../twiddles.ik1Q5cV1Vv7g.js";

async function main() {
  const stats = Stats.init();
  const viewport = Viewport.init();
  const world = World.init();

  const xStep = 125;
  const yStep = 125;
  const xStart = -250;
  const xMax = 250;
  let x = xStart;
  let y = 0;

  let lastEid;

  for (const renderableName of RenderableShapes) {
    const eid = addEntity(world);
    lastEid = eid;

    addComponent(world, Renderable, eid);
    addComponent(world, Position, eid);
    addComponent(world, Velocity, eid);

    Position.x[eid] = x;
    Position.y[eid] = y;

    Renderable.shape[eid] = RenderableShape[renderableName];

    x += xStep;
    if (x > xMax) {
      x = xStart;
      y += yStep;
    }
  }

  //addComponent(world, CameraFocus, lastEid);

  const { pane, paneUpdateSystem } = setupTwiddles(world, viewport);

  const focusSelectionSystem = (world) => {
    const clickedEid = renderQuery(world).find(
      (eid) => Renderable.mouseClicked[eid]
    );
    if (clickedEid) {
      const cameraFocusEid = cameraFocusQuery(world)[0];
      if (cameraFocusEid) {
        removeComponent(world, CameraFocus, cameraFocusEid);
      }
      addComponent(world, CameraFocus, clickedEid);
    }

    return world;
  };

  const pipeline = pipe(movementSystem, focusSelectionSystem, paneUpdateSystem);
  world.run(pipeline, viewport, stats);

  console.log("READY.");
}

main().catch(console.error);
