import * as PIXI from "pixi.js";
import { pipe, defineQuery, defineComponent, Types } from "bitecs";
import * as World from "../../../lib/world.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { movementSystem } from "../../../lib/positionMotion";
import {
  BaseEntityProxy,
  updateEntities,
  updateSprites,
} from "../../../lib/ecsUtils";
import { Position, Velocity } from "../../../lib/positionMotion";
import {
  mkrng,
  rngRange,
  rngChoose,
  rngIntRange,
  rngSign,
  rngTableSelector,
} from "../../../lib/randoms";
import { autoSizedRenderer, gridRenderer } from "../../../lib/viewport/pixi.js";
import { Pane } from "tweakpane";

async function main() {
  const world = World.init();

  const renderOptions = {};

  const { pane, paneUpdateSystem } = setupTwiddles({ world });

  world.run(
    pipe(avatarUpdateSystem(), movementSystem, paneUpdateSystem),
    pipe(
      autoSizedRenderer(renderOptions),
      avatarRenderer(renderOptions),
      gridRenderer()
    )
  );

  AvatarEntity.spawn(world, {
    Avatar: { width: 100, height: 100, seed: 1234 },
    Position: { x: 0, y: 0 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 100, height: 100, seed: 5678 },
    Position: { x: -300, y: 0 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 100, height: 100, seed: 9999 },
    Position: { x: 300, y: 0 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 100, height: 100, seed: 11 },
    Position: { x: -150, y: -200 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 100, height: 100, seed: 12 },
    Position: { x: 150, y: -200 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 150, height: 100, seed: 13 },
    Position: { x: -150, y: 200 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 150, height: 100, seed: 14 },
    Position: { x: 150, y: 200 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 125, height: 100, seed: 2002 },
    Position: { x: 0, y: -400 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 125, height: 100, seed: 1001 },
    Position: { x: 0, y: 400 },
  });

  console.log("READY.");
}

const avatarUpdateSystem = (options) => (world) => {
  return updateEntities(world, [[avatarQuery, AvatarEntity]]);
};

const avatarRendererInit = (world) => {
  const { stage } = world;
  const g = (world.gAvatar = new Graphics());
  stage.addChild(world.gAvatar);
};

const avatarRenderer = (options) => (world) => {
  const {
    stage,
    renderer: { width, height },
  } = world;

  if (!world.gAvatar) {
    avatarRendererInit(world);
  }

  const { gAvatar: g } = world;

  g.clear();

  return updateSprites(world, g, [
    [avatarQuery, AvatarEntity, AvatarSprite, "avatarprites"],
  ]);
};

let PARTICLE_TYPE_IDX = 0;
const AvatarParticleType = {
  RASTER: PARTICLE_TYPE_IDX++,
  SQUARE: PARTICLE_TYPE_IDX++,
  BOUNCING_LINE: PARTICLE_TYPE_IDX++,
  BOUNCING_RASTER: PARTICLE_TYPE_IDX++,
  BOUNCING_VERTICAL: PARTICLE_TYPE_IDX++,
  BOUNCING_ANGLE_RASTER: PARTICLE_TYPE_IDX++,
  BOUNCING_ANGLE_VERTICAL: PARTICLE_TYPE_IDX++,
  HEAD_SPINNER: PARTICLE_TYPE_IDX++,
  BODY_SPINNER: PARTICLE_TYPE_IDX++,
};

const AvatarSpecies = {
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
    [AvatarParticleType.BOUNCING_ANGLE_VERTICAL]: 1.0,
  },
  SQUARES: {
    [AvatarParticleType.SQUARE]: 3.0,
    [AvatarParticleType.RASTER]: 1.0,
  },
  /*
  CHAOS: {
    [AvatarParticleType.RASTER]: 1.0,
    [AvatarParticleType.SQUARE]: 1.0,
    [AvatarParticleType.BOUNCING_LINE]: 1.0,
    [AvatarParticleType.BOUNCING_RASTER]: 1.0,
    [AvatarParticleType.BOUNCING_VERTICAL]: 1.0,
    [AvatarParticleType.BOUNCING_ANGLE_RASTER]: 1.0,
    [AvatarParticleType.BOUNCING_ANGLE_VERTICAL]: 1.0,
    [AvatarParticleType.HEAD_SPINNER]: 1.0,
    [AvatarParticleType.BODY_SPINNER]: 1.0,
  }
  */
};

let PARTICLE_RECORD_LENGTH = 0;
const AvatarParticleRecordFields = {
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

const MIN_NUM_PARTICLES = 15;
const MAX_NUM_PARTICLES = 50;
const MIN_SPEED = 10;
const MAX_SPEED = 75;

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
    const avatarProps = props.Avatar || {};

    const { Avatar } = entity;

    const rng = mkrng(Avatar.seed);

    const { width, height } = Avatar;

    const species = rngChoose(Object.keys(AvatarSpecies), rng);

    const particleTypeSelector = rngTableSelector(AvatarSpecies[species], rng);

    Avatar.numParticles = Math.floor(
      rngRange(MIN_NUM_PARTICLES, MAX_NUM_PARTICLES, rng)
    );
    const particles = [];
    for (let idx = 0; idx < Avatar.numParticles; idx++) {
      const record = new Array(PARTICLE_RECORD_LENGTH);
      record[AvatarParticleRecordFields.TYPE] = particleTypeSelector();
      record[AvatarParticleRecordFields.COLOR] = rngIntRange(0, 0xffffff, rng);
      record[AvatarParticleRecordFields.X1] = rngRange(0, width, rng);
      record[AvatarParticleRecordFields.Y1] = rngRange(0, height, rng);
      record[AvatarParticleRecordFields.X2] = rngRange(0, width, rng);
      record[AvatarParticleRecordFields.Y2] = rngRange(0, height, rng);
      record[AvatarParticleRecordFields.DX1] =
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng);
      record[AvatarParticleRecordFields.DY1] =
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng);
      record[AvatarParticleRecordFields.DX2] =
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng);
      record[AvatarParticleRecordFields.DY2] =
        rngRange(MIN_SPEED, MAX_SPEED, rng) * rngSign(rng);
      particles.push(...record);
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
      ["width", AvatarParticleRecordFields.X1, AvatarParticleRecordFields.DX1],
      ["width", AvatarParticleRecordFields.X2, AvatarParticleRecordFields.DX2],
      ["height", AvatarParticleRecordFields.Y1, AvatarParticleRecordFields.DY1],
      ["height", AvatarParticleRecordFields.Y2, AvatarParticleRecordFields.DY2],
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

class AvatarSprite {
  static defaultOptions = {};

  constructor(world, entity, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };

    const {
      Avatar,
      Avatar: { width, height },
    } = entity;

    const g = new Graphics();

    const gTexture = new Graphics();
    g.addChild(gTexture);

    const gMask = new Graphics();
    gTexture.addChild(gMask);
    gTexture.mask = gMask;

    gMask.clear();

    gMask.lineStyle(1.5, 0xffffff, 1);
    gMask.beginFill(0xffffff);

    const hWidth = width / 2;
    const hHeight = height / 2;

    gMask.drawPolygon(
      ellipsePolygon(
        0,
        0 - height * 0.25,
        height * 0.25,
        height * 0.25,
        12,
        0,
        PI2
      )
    );

    gMask.drawPolygon(
      ellipsePolygon(0, hHeight, hWidth, height * 0.6, 12, Math.PI, PI2)
    );

    Object.assign(this, { g, gMask, gTexture });
  }

  root() {
    return this.g;
  }

  update(world, entity) {
    const {
      Avatar,
      Avatar: { width, height, numParticles, particles },
      Position: { x, y, r },
    } = entity;

    const { g, gTexture } = this;
    g.x = x;
    g.y = y;
    g.rotation = r;

    gTexture.clear();

    for (let idx = 0; idx < numParticles; idx++) {
      const ptr = idx * PARTICLE_RECORD_LENGTH;
      gTexture.lineStyle(
        1.0,
        Math.floor(particles[ptr + AvatarParticleRecordFields.COLOR]),
        1.0
      );
      switch (particles[ptr + AvatarParticleRecordFields.TYPE]) {
        case AvatarParticleType.RASTER:
          gTexture.moveTo(
            0 - width / 2,
            particles[ptr + AvatarParticleRecordFields.Y1] - height / 2
          );
          gTexture.lineTo(
            width / 2,
            particles[ptr + AvatarParticleRecordFields.Y1] - height / 2
          );
          break;
        case AvatarParticleType.SQUARE:
          gTexture.drawRect(
            particles[ptr + AvatarParticleRecordFields.X1] - width / 2,
            particles[ptr + AvatarParticleRecordFields.Y1] - height / 2,
            Math.abs(
              particles[ptr + AvatarParticleRecordFields.X1] -
                particles[ptr + AvatarParticleRecordFields.X2]
            ),
            Math.abs(
              particles[ptr + AvatarParticleRecordFields.Y1] -
                particles[ptr + AvatarParticleRecordFields.Y2]
            )
          );
          break;
        case AvatarParticleType.BOUNCING_LINE:
          gTexture.moveTo(
            particles[ptr + AvatarParticleRecordFields.X1] - width / 2,
            particles[ptr + AvatarParticleRecordFields.Y1] - height / 2
          );
          gTexture.lineTo(
            particles[ptr + AvatarParticleRecordFields.X2] - width / 2,
            particles[ptr + AvatarParticleRecordFields.Y2] - height / 2
          );
          break;
        case AvatarParticleType.BOUNCING_RASTER:
          gTexture.moveTo(
            0 - width / 2,
            particles[ptr + AvatarParticleRecordFields.Y1] - height / 2
          );
          gTexture.lineTo(
            width / 2,
            particles[ptr + AvatarParticleRecordFields.Y1] - height / 2
          );
          break;
        case AvatarParticleType.BOUNCING_VERTICAL:
          gTexture.moveTo(
            particles[ptr + AvatarParticleRecordFields.X1] - width / 2,
            0 - height / 2
          );
          gTexture.lineTo(
            particles[ptr + AvatarParticleRecordFields.X1] - width / 2,
            height / 2
          );
          break;
        case AvatarParticleType.BOUNCING_ANGLE_RASTER:
          gTexture.moveTo(
            0 - width / 2,
            particles[ptr + AvatarParticleRecordFields.Y1] - height / 2
          );
          gTexture.lineTo(
            width / 2,
            particles[ptr + AvatarParticleRecordFields.Y2] - height / 2
          );
          break;
        case AvatarParticleType.BOUNCING_ANGLE_VERTICAL:
          gTexture.moveTo(
            particles[ptr + AvatarParticleRecordFields.X1] - width / 2,
            0 - height / 2
          );
          gTexture.lineTo(
            particles[ptr + AvatarParticleRecordFields.X2] - width / 2,
            height / 2
          );
          break;
        case AvatarParticleType.HEAD_SPINNER:
          this.drawSpinner(
            gTexture,
            PI2 * (particles[ptr + AvatarParticleRecordFields.X2] / width),
            0,
            0 - height * 0.25,
            width * 0.25,
            0
          );
          break;
        case AvatarParticleType.BODY_SPINNER:
          this.drawSpinner(
            gTexture,
            PI2 * (particles[ptr + AvatarParticleRecordFields.X2] / width),
            0,
            height * 0.33,
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

function setupTwiddles({ title = document.title, expanded = false, world }) {
  const pane = new Pane();

  const f = pane.addFolder({ title, expanded });

  return {
    pane,
    paneUpdateSystem: (world) => {
      pane.refresh();
      return world;
    },
  };
}

main().catch(console.error);
