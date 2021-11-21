import * as PIXI from "../../../vendor/pkg/pixijs.js";
import { pipe, defineQuery, defineComponent, Types } from "../../../vendor/pkg/bitecs.js";
import * as World from "../../../lib/world.js";
import { SmoothGraphics as Graphics } from "../../../vendor/pkg/@pixi/graphics-smooth.js";
import { movementSystem } from "../../../lib/positionMotion.js";
import {
  BaseEntityProxy,
  updateEntities,
  updateSprites,
} from "../../../lib/ecsUtils.js";
import { Position, Velocity } from "../../../lib/positionMotion.js";
import {
  mkrng,
  rngRange,
  rngChoose,
  rngIntRange,
  rngSign,
} from "../../../lib/randoms.js";
import { autoSizedRenderer, gridRenderer } from "../../../lib/viewport/pixi.js";
import { Pane } from "../../../vendor/pkg/tweakpane.js";

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
    Avatar: { width: 50, height: 100, seed: 5 },
    Position: { x: -150, y: -200 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 50, height: 100, seed: 5 },
    Position: { x: 150, y: -200 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 150, height: 100, seed: 6 },
    Position: { x: -150, y: 200 },
  });

  AvatarEntity.spawn(world, {
    Avatar: { width: 150, height: 100, seed: 6 },
    Position: { x: 150, y: 200 },
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

const MAX_NUM_PARTICLES = 25;

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

    Avatar.width = avatarProps.width || rngIntRange(100, 200, rng);
    Avatar.height = avatarProps.height || rngIntRange(100, 200, rng);

    const { width, height } = Avatar;

    Avatar.numParticles = Math.floor(rngRange(15, MAX_NUM_PARTICLES, rng));
    const particles = [];
    for (let idx = 0; idx < Avatar.numParticles; idx++) {
      const record = new Array(PARTICLE_RECORD_LENGTH);
      record[AvatarParticleRecordFields.TYPE] = rngChoose(
        Object.values(AvatarParticleType),
        rng
      );
      record[AvatarParticleRecordFields.COLOR] = rngIntRange(0, 0xffffff, rng);
      record[AvatarParticleRecordFields.X1] = rngRange(0, width, rng);
      record[AvatarParticleRecordFields.Y1] = rngRange(0, height, rng);
      record[AvatarParticleRecordFields.X2] = rngRange(0, width, rng);
      record[AvatarParticleRecordFields.Y2] = rngRange(0, height, rng);
      record[AvatarParticleRecordFields.DX1] = rngRange(150, 300, rng) * rngSign(rng);
      record[AvatarParticleRecordFields.DY1] = rngRange(150, 300, rng) * rngSign(rng);
      record[AvatarParticleRecordFields.DX2] = rngRange(150, 300, rng) * rngSign(rng);
      record[AvatarParticleRecordFields.DY2] = rngRange(150, 300, rng) * rngSign(rng);
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

    gMask.drawPolygon(ellipsePolygon(
      0, 0 - height * 0.25,
      height * 0.25, height * 0.25,
      24,
      0,
      PI2
    ));

    gMask.drawPolygon(ellipsePolygon(
      0, hHeight,
      hWidth, height * 0.6,
      24,
      PI2 / 2,
      PI2
    ));

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
        1.5,
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
            particles[ptr + AvatarParticleRecordFields.Y2] - height / 2
          );
          break;
      }
    }
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
