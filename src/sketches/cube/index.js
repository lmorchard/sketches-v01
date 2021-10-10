import * as PIXI from "pixi.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { addEntity, addComponent, pipe, removeComponent } from "bitecs";
import * as Stats from "../../lib/stats.js";
import * as World from "../../lib/world.js";
import * as Viewport from "../../lib/viewport/pixi.js";
import {
  RenderableShape,
  RenderableShapes,
  Renderable,
} from "../../lib/viewport/index.js";
import { Position, Velocity } from "../../lib/positionMotion.js";
import { setupTwiddles } from "../twiddles.js";

import FontFutural from "../../fonts/futural.json";
import FontFuturam from "../../fonts/futuram.json";
import FontScripts from "../../fonts/scripts.json";
import FontScriptc from "../../fonts/scriptc.json";
import FontRowmant from "../../fonts/rowmant.json";

const fonts = [FontFutural, FontFuturam, FontScripts, FontScriptc, FontRowmant];

const nodes = [
  [-1, -1, -1],
  [-1, -1, 1],
  [-1, 1, -1],
  [-1, 1, 1],
  [1, -1, -1],
  [1, -1, 1],
  [1, 1, -1],
  [1, 1, 1],
];
const edges = [
  [0, 1],
  [1, 3],
  [3, 2],
  [2, 0],
  [4, 5],
  [5, 7],
  [7, 6],
  [6, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

function scale(factor0, factor1, factor2) {
  nodes.forEach(function (node) {
    node[0] *= factor0;
    node[1] *= factor1;
    node[2] *= factor2;
  });
}

function rotateCuboid(angleX, angleY) {
  var sinX = Math.sin(angleX);
  var cosX = Math.cos(angleX);

  var sinY = Math.sin(angleY);
  var cosY = Math.cos(angleY);

  nodes.forEach(function (node) {
    var x = node[0];
    var y = node[1];
    var z = node[2];

    node[0] = x * cosX - z * sinX;
    node[2] = z * cosX + x * sinX;

    z = node[2];

    node[1] = y * cosY - z * sinY;
    node[2] = z * cosY + y * sinY;
  });
}

function drawCuboid(g) {
  g.clear();

  g.lineStyle(2, 0xffaa33, 1);

  edges.forEach(function (edge) {
    var p1 = nodes[edge[0]];
    var p2 = nodes[edge[1]];
    g.moveTo(p1[0], p1[1]);
    g.lineTo(p2[0], p2[1]);
  });
}

async function main() {
  const stats = Stats.init();
  const viewport = Viewport.init();
  const world = World.init();

  const g = new Graphics();
  viewport.stage.addChild(g);

  g.lineStyle(2, 0xffaa33, 1);
  g.moveTo(-100, -100);
  g.lineTo(100, 100);

  scale(200, 200, 200);
  rotateCuboid(Math.PI / 4, Math.atan(Math.sqrt(2)));

  setInterval(function () {
    rotateCuboid(Math.PI / 90, Math.PI / 220);
    drawCuboid(g);
  }, 17);

  const { paneUpdateSystem } = setupTwiddles(world, viewport);
  const pipeline = pipe(paneUpdateSystem);
  world.run(pipeline, viewport, stats);

  console.log("READY.");
}

main().catch(console.error);
