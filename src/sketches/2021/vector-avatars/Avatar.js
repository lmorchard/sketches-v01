import * as PIXI from "pixi.js";
import { defineQuery, defineComponent, Types } from "bitecs";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { BaseEntityProxy } from "../../../lib/ecsUtils";
import { Position, Velocity } from "../../../lib/positionMotion";
import { hslToRgb } from "../../../lib/hslToRgb";
import {
  mkrng,
  rngRange,
  rngChoose,
  rngSign,
  rngTableSelector,
} from "../../../lib/randoms";

const PI2 = Math.PI * 2.0;

function ellipsePolygon(
  centerX,
  centerY,
  radiusX,
  radiusY,
  numPoints,
  angleStart,
  angleEnd
) {
  const angleStep = (angleEnd - angleStart) / numPoints;
  const points = [];
  for (let angle = angleStart; angle <= angleEnd; angle += angleStep) {
    const x = radiusX * Math.cos(angle) + centerX;
    const y = radiusY * Math.sin(angle) + centerY;
    points.push(new PIXI.Point(x, y));
  }
  return new PIXI.Polygon(points);
}

let PARTICLE_TYPE_IDX = 0;
export const AvatarParticleType = {
  RASTER: PARTICLE_TYPE_IDX++,
  SQUARE: PARTICLE_TYPE_IDX++,
  TRIANGLES: PARTICLE_TYPE_IDX++,
  BOUNCING_LINE: PARTICLE_TYPE_IDX++,
  BOUNCING_RASTER: PARTICLE_TYPE_IDX++,
  BOUNCING_VERTICAL: PARTICLE_TYPE_IDX++,
  BOUNCING_ANGLE_RASTER: PARTICLE_TYPE_IDX++,
  BOUNCING_ANGLE_VERTICAL: PARTICLE_TYPE_IDX++,
  HEAD_SPINNER: PARTICLE_TYPE_IDX++,
  BODY_SPINNER: PARTICLE_TYPE_IDX++,
};

export const AvatarSpecies = {
  PLAID: {
    [AvatarParticleType.BOUNCING_RASTER]: 1.0,
    [AvatarParticleType.BOUNCING_VERTICAL]: 1.0,
  },
  RADIAL: {
    [AvatarParticleType.HEAD_SPINNER]: 2.0,
    [AvatarParticleType.BODY_SPINNER]: 3.0,
    [AvatarParticleType.RASTER]: 1.0,
  },
  RASTER: {
    [AvatarParticleType.RASTER]: 1.0,
  },
  ANGLER: {
    [AvatarParticleType.BOUNCING_ANGLE_RASTER]: 2.0,
    [AvatarParticleType.BOUNCING_ANGLE_VERTICAL]: 2.0,
  },
  SQUARES: {
    [AvatarParticleType.SQUARE]: 3.0,
    [AvatarParticleType.RASTER]: 1.0,
  },
  TRIANGLES: {
    [AvatarParticleType.TRIANGLES]: 1.0,
  },
};

let PARTICLE_RECORD_LENGTH = 0;
export const AvatarParticleFields = {
  TYPE: PARTICLE_RECORD_LENGTH++,
  COLOR: PARTICLE_RECORD_LENGTH++,
  X1: PARTICLE_RECORD_LENGTH++,
  Y1: PARTICLE_RECORD_LENGTH++,
  DX1: PARTICLE_RECORD_LENGTH++,
  DY1: PARTICLE_RECORD_LENGTH++,
  X2: PARTICLE_RECORD_LENGTH++,
  Y2: PARTICLE_RECORD_LENGTH++,
  DX2: PARTICLE_RECORD_LENGTH++,
  DY2: PARTICLE_RECORD_LENGTH++,
};

const MIN_NUM_PARTICLES = 10;
const MAX_NUM_PARTICLES = 50;
const MIN_SPEED = 2;
const MAX_SPEED = 25;

export const Avatar = defineComponent({
  seed: Types.f32,
  width: Types.f32,
  height: Types.f32,
  numParticles: Types.ui8,
  particles: [Types.f32, MAX_NUM_PARTICLES * PARTICLE_RECORD_LENGTH],
});

export const avatarQuery = defineQuery([Position, Velocity, Avatar]);

export class AvatarEntity extends BaseEntityProxy {
  static components = {
    Position,
    Velocity,
    Avatar,
  };

  static defaults = {
    Avatar: {
      seed: () => Math.random(),
    },
  };

  static spawn(world, props = {}) {
    const entity = super.spawn(world, props);

    const { Avatar } = entity;
    const { width, height, seed } = Avatar;

    const rng = mkrng(seed);

    const species = rngChoose(Object.keys(AvatarSpecies), rng);
    const particleTypeSelector = rngTableSelector(AvatarSpecies[species], rng);

    const hueStart = rng();
    const hueRange = rng() * 0.8;
    const saturation = rngRange(0.3, 0.6, rng);
    const lightness = rngRange(0.3, 0.6, rng);

    Avatar.numParticles = Math.floor(
      rngRange(MIN_NUM_PARTICLES, MAX_NUM_PARTICLES, rng)
    );

    const particles = [];
    for (let idx = 0; idx < Avatar.numParticles; idx++) {
      const hue = (hueStart + rng() * hueRange) % 1.0;
      const color = hslToRgb(hue, saturation, lightness);
      particles.push(
        particleTypeSelector(),
        color,
        rngRange(0, width, rng),
        rngRange(0, height, rng),
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng),
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng),
        rngRange(0, width, rng),
        rngRange(0, height, rng),
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng),
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng)
      );
    }
    Avatar.particles.set(particles);

    return entity;
  }

  update(world) {
    const {
      time: { deltaSec },
    } = world;

    const { Avatar } = this;
    const { numParticles, particles } = Avatar;

    const updates = [
      ["width", AvatarParticleFields.X1, AvatarParticleFields.DX1],
      ["width", AvatarParticleFields.X2, AvatarParticleFields.DX2],
      ["height", AvatarParticleFields.Y1, AvatarParticleFields.DY1],
      ["height", AvatarParticleFields.Y2, AvatarParticleFields.DY2],
    ];
    for (let idx = 0; idx < numParticles; idx++) {
      const ptr = idx * PARTICLE_RECORD_LENGTH;
      for (let [boundName, varyingOffset, speedOffset] of updates) {
        let speed = particles[ptr + speedOffset];
        let varying = particles[ptr + varyingOffset] + speed * deltaSec;
        if (varying < 0) {
          varying = 0;
          speed = speed * -1;
        } else if (varying > Avatar[boundName]) {
          varying = Avatar[boundName];
          speed = speed * -1;
        }
        particles[ptr + speedOffset] = speed;
        particles[ptr + varyingOffset] = varying;
      }
    }
  }
}

export class AvatarSprite {
  static defaultOptions = {};

  constructor(world, entity, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };

    const {
      Avatar: { width, height },
    } = entity;

    const g = new Graphics();

    const gTexture = new Graphics();
    g.addChild(gTexture);
    gTexture.x = 0 - width / 2;
    gTexture.y = 0 - height / 2;

    const gMask = new Graphics();
    gTexture.addChild(gMask);
    gTexture.mask = gMask;

    gMask.clear();
    gMask.lineStyle(1.5, 0xffffff, 1);
    gMask.beginFill(0xffffff);

    const hWidth = width / 2;

    // head portion of mask
    gMask.drawPolygon(
      ellipsePolygon(
        hWidth,
        height * 0.25,
        height * 0.25,
        height * 0.25,
        12,
        0,
        PI2
      )
    );

    // body portion of mask
    gMask.drawPolygon(
      ellipsePolygon(hWidth, height, hWidth, height * 0.6, 12, Math.PI, PI2)
    );

    Object.assign(this, { g, gMask, gTexture });
  }

  root() {
    return this.g;
  }

  update(world, entity) {
    const {
      Avatar: { width, height, numParticles, particles },
      Position: { x, y, r },
    } = entity;

    const hWidth = width / 2;

    const { g: gRoot, gTexture: g } = this;
    gRoot.x = x;
    gRoot.y = y;
    gRoot.rotation = r;

    g.clear();

    for (let idx = 0; idx < numParticles; idx++) {
      const [type, color, x1, y1, dx1, dy1, x2, y2, dx2, dy2] =
        particles.subarray(
          idx * PARTICLE_RECORD_LENGTH,
          (idx + 1) * PARTICLE_RECORD_LENGTH
        );

      g.lineStyle(1.5, color, 1.0);

      const x1m = width - x1;
      const y1m = height - y1;
      const x2m = width - x2;
      const y2m = height - y2;

      switch (type) {
        case AvatarParticleType.RASTER:
          g.moveTo(0, y1);
          g.lineTo(width, y1);
          break;
        case AvatarParticleType.SQUARE:
          g.moveTo(x1, y1);
          g.lineTo(x2, y1);
          g.lineTo(x2, y2);
          g.lineTo(x1, y2);
          g.lineTo(x1, y1);
          break;
        case AvatarParticleType.TRIANGLES:
          g.moveTo(x1, y1);
          g.lineTo(x1m, y1);
          g.lineTo(x1, y2);
          g.lineTo(x1m, y2);
          g.lineTo(x1, y1);
          break;
        case AvatarParticleType.BOUNCING_LINE:
          g.moveTo(x1, y1);
          g.lineTo(x2, y2);
          break;
        case AvatarParticleType.BOUNCING_RASTER:
          g.moveTo(0, y1);
          g.lineTo(width, y1);
          break;
        case AvatarParticleType.BOUNCING_VERTICAL:
          g.moveTo(x1, 0);
          g.lineTo(x1, height);
          break;
        case AvatarParticleType.BOUNCING_ANGLE_RASTER:
          g.moveTo(0, y1);
          g.lineTo(width, y2);
          break;
        case AvatarParticleType.BOUNCING_ANGLE_VERTICAL:
          g.moveTo(x1, 0);
          g.lineTo(x2, height);
          break;
        case AvatarParticleType.HEAD_SPINNER:
          this.drawSpinner(
            g,
            PI2 * (x2 / width),
            hWidth,
            height * 0.25,
            width * 0.25,
            0
          );
          break;
        case AvatarParticleType.BODY_SPINNER:
          this.drawSpinner(
            g,
            PI2 * (x2 / width),
            hWidth,
            height * 0.66,
            width * 0.5,
            0
          );
          break;
      }
    }
  }

  drawSpinner(g, angle, cx, cy, dx, dy) {
    const x = Math.cos(angle) * dx - Math.sin(angle) * dy + cx;
    const y = Math.sin(angle) * dx - Math.cos(angle) * dy + cy;
    const x2 =
      Math.cos(Math.PI + angle) * dx - Math.sin(Math.PI + angle) * dy + cx;
    const y2 =
      Math.sin(Math.PI + angle) * dx - Math.cos(Math.PI + angle) * dy + cy;
    g.moveTo(x, y);
    g.lineTo(x2, y2);
  }
}
