import { defineQuery, defineComponent, Types } from "bitecs";
import Easings from "../../../../lib/easings.js";
import { transition } from "../../../../lib/transitions.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { BaseEntityProxy } from "../../../../lib/ecsUtils";
import { Position, Velocity } from "../../../../lib/positionMotion";
import perlin from "../../../../lib/perlin.js";

const NUM_SIGNAL_POINTS = 36;

export const OraclePointer = defineComponent({
  targetSymbol: Types.eid,
  moveActive: Types.ui8,
  moveFromX: Types.f32,
  moveFromY: Types.f32,
  moveToX: Types.f32,
  moveToY: Types.f32,
  moveDuration: Types.f32,
  moveElapsed: Types.f32,
  noiseElapsed: Types.f32,
  signalPoints: [Types.f32, NUM_SIGNAL_POINTS],
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

  static defaults = {
    OraclePointer: {
      noiseElapsed: 0,
      signalPoints: () => {
        const points = [];
        for (let idx = 0; idx < NUM_SIGNAL_POINTS; idx++) {
          points.push(0);
        }
        points[0] = 1.0;
        return points;
      },
    },
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
    reticuleRadius: 30,
    reticuleInnerRadius: 18,
  };

  constructor(world, pointerEntity, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };

    const g = new Graphics();

    const gLines = new Graphics();
    g.addChild(gLines);

    const gReticule = new Graphics();
    g.addChild(gReticule);

    const gSignals = new Graphics();
    gReticule.addChild(gSignals);

    Object.assign(this, { g, gReticule, gLines, gSignals });
  }

  root() {
    return this.g;
  }

  update(world, pointerEntity) {
    const { gReticule, gLines, gSignals, options } = this;
    const {
      OraclePointer: { signalPoints },
      Position: { x, y },
    } = pointerEntity;
    const {
      time: { delta },
      renderer: { width, height },
    } = world;

    const scale = width / 700;
    const reticuleRadius = options.reticuleRadius * scale;
    const reticuleInnerRadius = options.reticuleInnerRadius * scale;

    pointerEntity.OraclePointer.noiseElapsed += delta;
    if (pointerEntity.OraclePointer.noiseElapsed > 100000) {
      pointerEntity.OraclePointer.noiseElapsed = 0;
    }

    gSignals.clear();
    gSignals.lineStyle(2, 0x33ff33, 1);
    let firstX = null;
    let firstY = null;
    const signalStep = (2 * Math.PI) / NUM_SIGNAL_POINTS;
    for (let idx = 0; idx < NUM_SIGNAL_POINTS; idx++) {
      const signal = signalPoints[idx] * 0.9;
      const noise = perlin.get(
        (idx / NUM_SIGNAL_POINTS) * 10,
        pointerEntity.OraclePointer.noiseElapsed / 500
      ) + 0.1;
      const received = Math.min(1.0, Math.max(0.1, signal + noise));
      const distanceRange = reticuleRadius - reticuleInnerRadius;
      const signalDistance = received * distanceRange;

      const r = signalStep * idx;
      const x = 0 + (reticuleInnerRadius + signalDistance) * Math.cos(r);
      const y = 0 + (reticuleInnerRadius + signalDistance) * Math.sin(r);

      if (firstX === null) {
        firstX = x;
        firstY = y;
        gSignals.moveTo(x, y);
        continue;
      } else {
        gSignals.lineTo(x, y);
      }
    }
    gSignals.lineTo(firstX, firstY);

    gReticule.clear();
    gReticule.x = x;
    gReticule.y = y;
    gReticule.lineStyle(2, 0x33ff33, 1);
    gReticule.drawCircle(0, 0, reticuleRadius);
    gReticule.lineStyle(1, 0x33ff33, 1);
    gReticule.drawCircle(0, 0, reticuleInnerRadius);

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
