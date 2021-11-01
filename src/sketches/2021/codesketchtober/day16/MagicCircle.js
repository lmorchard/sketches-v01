import * as PIXI from "pixi.js";
import { defineQuery, defineComponent, Types } from "bitecs";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { BaseEntityProxy } from "../../../../lib/ecsUtils";
import { Position, Velocity } from "../../../../lib/positionMotion";

export const MagicCircle = defineComponent({
  row: Types.ui8,
  col: Types.ui8,
  count: Types.ui8,
  mainRadius: Types.f32,
  innerRadius: Types.f32,
  numLines: Types.ui8,
  numCircles: Types.ui8,
  isRewinding: Types.ui8,
  rewindSpeedFactor: Types.f32,
  rotationSpeed: Types.f32,
  phaseDurationRemining: Types.f32,
  delayUntilRewind: Types.f32,
  rewindPeriod: Types.f32,
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
      numLines: () => Math.floor(3 + 5 * Math.random()),
      numCircles: () => Math.floor(3 + 5 * Math.random()),
      isRewinding: 1,
      rewindSpeedFactor: 4,
      rotationSpeed: () => Math.PI * (0.1 + Math.random() * 0.2),
      phaseDurationRemining: 0,
      delayUntilRewind: () => 5000 + 5000 * Math.random(),
      rewindPeriod: () => 1000 + 1000 * Math.random(),
    },
  };

  update(world) {}
}

export class MagicCircleSprite {
  static defaultOptions = {};

  constructor(world, circleEntity, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };

    const {
      renderer: { width, height },
    } = world;

    const g = new Graphics();

    const gBorder = new Graphics();
    g.addChild(gBorder);

    const gLines = new Graphics();
    g.addChild(gLines);

    const gCircles = new Graphics();
    g.addChild(gCircles);

    const gMask = new Graphics();
    gCircles.addChild(gMask);
    gCircles.mask = gMask;

    Object.assign(this, {
      g,
      gBorder,
      gLines,
      gCircles,
      gMask,
      lastWidth: null,
      circlesDistanceFactor: Math.random(),
      circleRadiusFactor: Math.random(),
    });
  }

  root() {
    return this.g;
  }

  update(world, circleEntity, circleEntities) {
    const {
      renderer: { width, height },
      time: { delta },
    } = world;

    const {
      Velocity,
      MagicCircle,
      MagicCircle: {
        row,
        col,
        count,
        rotationSpeed,
        rewindSpeedFactor,
        delayUntilRewind,
        rewindPeriod,
      },
    } = circleEntity;

    const mainRadius = (width / (count / 2)) * 0.4;
    const innerRadius = mainRadius * 0.8;

    MagicCircle.phaseDurationRemining -= delta;
    if (MagicCircle.phaseDurationRemining <= 0) {
      MagicCircle.isRewinding = MagicCircle.isRewinding ? 0 : 1;
      Velocity.r = MagicCircle.isRewinding
        ? (0 - rewindSpeedFactor) * rotationSpeed
        : rotationSpeed;
      MagicCircle.phaseDurationRemining = MagicCircle.isRewinding
        ? rewindPeriod
        : delayUntilRewind;
    }

    const {
      Position: { r },
    } = circleEntity;

    let x, y;
    if (width > height) {
      const xStart = 0 - width * 0.5;
      const xEnd = width * 0.5;
      const xStep = (xEnd - xStart) / (count / 2);
      x = xStart + xStep / 2 + xStep * col;
      y = (height / 2 - mainRadius * 1.15) * (row === 0 ? 1 : -1);
    } else {
      const yStart = 0 - height * 0.5;
      const yEnd = height * 0.5;
      const yStep = (yEnd - yStart) / (count / 2);
      y = yStart + yStep / 2 + yStep * col;
      x = (width / 2 - mainRadius * 1.15) * (row === 0 ? 1 : -1);
    }

    const { g } = this;
    g.x = x;
    g.y = y;
    g.rotation = r;

    if (this.lastWidth === width) return;

    this.lastWidth = width;

    const {
      gBorder,
      gLines,
      gCircles,
      gMask,
      circlesDistanceFactor,
      circleRadiusFactor,
    } = this;

    const {
      MagicCircle: { numLines, numCircles },
    } = circleEntity;

    gBorder.clear();
    gBorder.lineStyle(1, 0x33ff33, 1);
    gBorder.drawCircle(0, 0, mainRadius);
    gBorder.drawCircle(0, 0, innerRadius);

    const points = [];
    for (let r = 0; r < Math.PI * 2; r += (Math.PI * 2) / numLines) {
      const x = 0 + innerRadius * Math.cos(r);
      const y = 0 + innerRadius * Math.sin(r);
      points.push([x, y]);
    }

    gLines.clear();
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
    const circleDistance =
      innerRadius * 0.33 + innerRadius * 0.66 * circlesDistanceFactor;
    const circleRadius =
      innerRadius * 0.2 + innerRadius * 0.5 * circleRadiusFactor;
    for (let r = 0; r < Math.PI * 2; r += (Math.PI * 2) / numCircles) {
      const x = 0 + circleDistance * Math.cos(r);
      const y = 0 + circleDistance * Math.sin(r);
      circleCenters.push([x, y]);
    }

    gCircles.clear();
    gCircles.lineStyle(1, 0x33ff33, 1);
    for (let idx = 0; idx < circleCenters.length; idx++) {
      const [x1, y1] = circleCenters[idx];
      gCircles.drawCircle(x1, y1, circleRadius);
    }

    gMask.clear();
    const maskPoints = points.map(([x, y]) => new PIXI.Point(x, y));
    const maskPolygon = new PIXI.Polygon(maskPoints);
    gMask.beginFill(0x000000);
    gMask.drawPolygon(maskPolygon);
  }
}
