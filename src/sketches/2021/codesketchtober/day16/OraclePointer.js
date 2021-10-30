import { defineQuery, defineComponent, Types } from "bitecs";
import Easings from "../../../../lib/easings.js";
import { transition } from "../../../../lib/transitions.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { BaseEntityProxy } from "../../../../lib/ecsUtils";
import { Position, Velocity } from "../../../../lib/positionMotion";

export const OraclePointer = defineComponent({
  targetSymbol: Types.eid,
  moveActive: Types.ui8,
  moveFromX: Types.f32,
  moveFromY: Types.f32,
  moveToX: Types.f32,
  moveToY: Types.f32,
  moveDuration: Types.f32,
  moveElapsed: Types.f32,
});

export const oraclePointerQuery = defineQuery([
  Position,
  Velocity,
  OraclePointer,
]);

export class OraclePointerEntity extends BaseEntityProxy {
  static components = {
    Position,
    Velocity,
    OraclePointer,
  };

  setTarget(eid, duration = 1500.0) {
    const { OraclePointer: o } = this;
    o.targetSymbol = eid;
    o.moveActive = 1;
    o.moveFromX = this.Position.x;
    o.moveFromY = this.Position.y;
    o.moveToX = Position.x[eid];
    o.moveToY = Position.y[eid];
    o.moveElapsed = 0.0;
    o.moveDuration = duration;
  }

  update(world) {
    if (!this.OraclePointer.moveActive) return;

    const {
      OraclePointer: { targetSymbol },
    } = this;

    this.OraclePointer.moveToX = Position.x[targetSymbol];
    this.OraclePointer.moveToY = Position.y[targetSymbol];

    const {
      OraclePointer: {
        moveFromX,
        moveFromY,
        moveToX,
        moveToY,
        moveDuration,
        moveElapsed,
      },
    } = this;

    const moveEase = Easings.easeInOutExpo;

    this.Position.x = transition(
      moveFromX,
      moveToX,
      moveDuration,
      moveElapsed,
      moveEase
    );

    this.Position.y = transition(
      moveFromY,
      moveToY,
      moveDuration,
      moveElapsed,
      moveEase
    );

    this.OraclePointer.moveElapsed += world.time.delta;
    if (this.OraclePointer.moveElapsed >= moveDuration) {
      this.OraclePointer.moveActive = 0;
      this.Position.x = this.OraclePointer.moveToX;
      this.Position.y = this.OraclePointer.moveToY;
    }
  }
}

export class OraclePointerSprite {
  static defaultOptions = {
    reticuleRadius: 55,
    reticuleInnerRadius: 40,
  };

  constructor(world, pointerEntity, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };
    const { reticuleRadius, reticuleInnerRadius } = this.options;

    const g = new Graphics();

    const gLines = new Graphics();
    g.addChild(gLines);

    const gReticule = new Graphics();
    g.addChild(gReticule);

    gReticule.lineStyle(2, 0x33ff33, 1);
    gReticule.drawCircle(0, 0, reticuleInnerRadius);
    gReticule.drawCircle(0, 0, reticuleRadius);

    Object.assign(this, { g, gReticule, gLines });
  }

  root() {
    return this.g;
  }

  update(world, pointerEntity) {
    const { gReticule, gLines, options } = this;
    const { reticuleRadius, reticuleInnerRadius } = options;
    const {
      Position: { x, y },
    } = pointerEntity;
    const {
      renderer: { width, height },
    } = world;

    gReticule.x = x;
    gReticule.y = y;

    gLines.clear();
    gLines.lineStyle(2, 0x33ff33, 1);

    const xr = width / 2;
    const xl = 0 - xr;
    const yb = height / 2;
    const yt = 0 - yb;

    gLines.moveTo(xl, y);
    gLines.lineTo(x - reticuleRadius, y);
    gLines.moveTo(xr, y);
    gLines.lineTo(x + reticuleRadius, y);
    gLines.moveTo(x, yt);
    gLines.lineTo(x, y - reticuleRadius);
    gLines.moveTo(x, yb);
    gLines.lineTo(x, y + reticuleRadius);
  }
}
