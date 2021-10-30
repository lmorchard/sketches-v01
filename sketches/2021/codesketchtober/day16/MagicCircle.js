import * as PIXI from "../../../../vendor/pkg/pixijs.js";
import { defineQuery, defineComponent, Types } from "../../../../vendor/pkg/bitecs.js";
import Easings from "../../../../lib/easings.js";
import { transition } from "../../../../lib/transitions.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";
import { BaseEntityProxy } from "../../../../lib/ecsUtils.js";
import { Position, Velocity } from "../../../../lib/positionMotion.js";

export const MagicCircle = defineComponent({
  mainRadius: Types.f32,
  innerRadius: Types.f32,
  numLines: Types.ui8,
  numCircles: Types.ui8,
});

export const magicCircleQuery = defineQuery([Position, Velocity, MagicCircle]);

export class MagicCircleEntity extends BaseEntityProxy {
  static components = {
    Position,
    Velocity,
    MagicCircle,
  };

  static defaults = {
    MagicCircle: {
      mainRadius: 80,
      innerRadius: 70,
    },
  };

  update(world) {}
}

export class MagicCircleSprite {
  static defaultOptions = {};

  constructor(world, circleEntity, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };

    const {
      MagicCircle: { mainRadius, innerRadius, numLines, numCircles },
    } = circleEntity;

    const g = new Graphics();

    const gBorder = new Graphics();
    g.addChild(gBorder);

    gBorder.lineStyle(1, 0x33ff33, 1);
    gBorder.drawCircle(0, 0, mainRadius);
    gBorder.drawCircle(0, 0, innerRadius);

    const points = [];
    for (let r = 0; r < Math.PI * 2; r += (Math.PI * 2) / numLines) {
      const x = 0 + innerRadius * Math.cos(r);
      const y = 0 + innerRadius * Math.sin(r);
      points.push([x, y]);
    }

    const gLines = new Graphics();
    g.addChild(gLines);

    gLines.lineStyle(1, 0x33ff33, 1);
    for (let pointIdx = 0; pointIdx < points.length; pointIdx++) {
      for (
        let otherPointIdx = 0;
        otherPointIdx < points.length;
        otherPointIdx++
      ) {
        if (pointIdx === otherPointIdx) continue;
        const [x1, y1] = points[pointIdx];
        const [x2, y2] = points[otherPointIdx];
        gLines.moveTo(x1, y1);
        gLines.lineTo(x2, y2);
      }
    }

    const circleCenters = [];
    const circleDistance = (innerRadius * 0.33) + (innerRadius * 0.66) * Math.random();
    const circleRadius = (innerRadius * 0.2) + (innerRadius * 0.5) * Math.random();
    for (let r = 0; r < Math.PI * 2; r += (Math.PI * 2) / numCircles) {
      const x = 0 + circleDistance * Math.cos(r);
      const y = 0 + circleDistance * Math.sin(r);
      circleCenters.push([x, y]);
    }

    const gCircles = new Graphics();
    g.addChild(gCircles);

    gCircles.lineStyle(1, 0x33ff33, 1);
    for (let idx = 0; idx < circleCenters.length; idx++) {
      const [x1, y1] = circleCenters[idx];
      gCircles.drawCircle(x1, y1, circleRadius);
    }

    const gMask = new Graphics();
    gCircles.addChild(gMask);
    gCircles.mask = gMask;

    const maskPoints = points.map(([x,y]) => new PIXI.Point(x, y));
    const maskPolygon = new PIXI.Polygon(maskPoints);
    gMask.beginFill(0x000000);
    gMask.drawPolygon(maskPolygon);
    //gMask.drawCircle(0, 0, innerRadius);

    Object.assign(this, { g });
  }

  root() {
    return this.g;
  }

  update(world, circleEntity) {
    const g = this.root();
    const {
      Position: { x, y, r },
    } = circleEntity;
    g.x = x;
    g.y = y;
    g.rotation = r;
  }
}
