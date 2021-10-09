import p5 from "p5";
import * as utils from "../p5-utils";
let canvas;

function setup() {  
  canvas = utils.standardCanvas();
  reset();
  noStroke();
  noLoop();
}

function reset() {
  clear();
}

function drawGrid() {
  const squares = floor(random(10, 30));
  const squareSize = width / squares;
  push();
  stroke('#dddddd');
  strokeWeight(utils.relSize(1));

  for (let x = 0; x < squares; x++) {
    line(0, (x+0.5) * squareSize, width, (x+0.5) * squareSize);
    line((x+0.5) * squareSize, 0, (x+0.5) * squareSize, height);

  }
  pop();
}

function draw() {
  background('#111111');

  drawGrid();
}


utils.attach({
  setup,
  draw,
  canvas,
  mouseReleased: utils.standardMouseReleasedFactory(reset),
  keyPressed: utils.standardKeyPressed
});