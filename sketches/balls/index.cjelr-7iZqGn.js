import { addEntity, addComponent, pipe } from "../../vendor/pkg/bitecs.NAhENCKzJOVt.js";
import { rngIntRange } from "../../lib/randoms.Tx30J0bbJd9y.js";
import * as Stats from "../../lib/stats.kmT9S2XHaHWD.js";
import * as World from "../../lib/world.LNwdjn2kAWyp.js";
import * as Viewport from "../../lib/viewport/pixi.h5vEDTNcChhr.js";
import { Renderable, RenderableShape } from "../../lib/viewport/index.CpZuvs6nLZ_y.js";
import {
  Position,
  Velocity,
  movementSystem,
  bouncerSystem,
} from "../../lib/positionMotion.l-PS2cXo6TSL.js";
import { setupTwiddles } from "../twiddles.ik1Q5cV1Vv7g.js";

async function main() {
  const stats = Stats.init();
  const world = World.init();
  const viewport = Viewport.init();

  const spawnBall = () => {
    const eid = addEntity(world);

    addComponent(world, Renderable, eid);
    Renderable.shape[eid] = RenderableShape.Ball;
    Renderable.color[eid] = Math.floor(0xffffff * Math.random());

    addComponent(world, Position, eid);
    Position.x[eid] = rngIntRange(-300, 300);
    Position.y[eid] = rngIntRange(-300, 300);
    Position.z[eid] = rngIntRange(1, 6);

    addComponent(world, Velocity, eid);
    Velocity.x[eid] = rngIntRange(-100, 100);
    Velocity.y[eid] = rngIntRange(-100, 100);
    Velocity.z[eid] = rngIntRange(-12, 12);

    return eid;
  };

  for (let idx = 0; idx < 100; idx++) {
    spawnBall();
  }

  const { paneUpdateSystem } = setupTwiddles(world, viewport);
  const pipeline = pipe(movementSystem, bouncerSystem, paneUpdateSystem);
  world.run(pipeline, viewport, stats);
  console.log("READY.");
}

main().catch(console.error);
