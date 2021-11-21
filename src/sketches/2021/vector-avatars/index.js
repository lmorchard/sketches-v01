import * as PIXI from "pixi.js";
import { pipe, defineQuery, defineComponent, Types } from "bitecs";
import * as World from "../../../lib/world.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { movementSystem } from "../../../lib/positionMotion";
import { BaseEntityProxy, updateEntities, updateSprites } from "../../../lib/ecsUtils";
import { Position, Velocity } from "../../../lib/positionMotion";

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
    Position: { x: 0, y: 0 },
  });

  AvatarEntity.spawn(world, {
    Position: { x: -300, y: 0 },
  });

  AvatarEntity.spawn(world, {
    Position: { x: 300, y: 0 },
  });

  AvatarEntity.spawn(world, {
    Position: { x: -150, y: -200 },
  });

  AvatarEntity.spawn(world, {
    Position: { x: 150, y: -200 },
  });

  AvatarEntity.spawn(world, {
    Position: { x: -150, y: 200 },
  });

  AvatarEntity.spawn(world, {
    Position: { x: 150, y: 200 },
  });

  console.log("READY.");
}

const MAX_NUM_RASTERS = 25;
const RASTER_REC_LEN = 3;

export const Avatar = defineComponent({
  seed: Types.f32,
  width: Types.f32,
  height: Types.f32,
  rasters: [Types.f32, MAX_NUM_RASTERS * RASTER_REC_LEN],
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
      width: 100,
      height: 200,
      rasters: () => {
        const rasters = [];
        for (let idx = 0; idx < MAX_NUM_RASTERS; idx++) {
          rasters.push(
            200 * Math.random(),
            Math.floor(0xffffff * Math.random()),
            50 + 150 * Math.random() * (Math.random() > 0.5 ? -1 : 1)
          );
        }
        return rasters;
      },
    },
  };

  update(world) {
    const {
      time: { deltaSec }
    } = world;

    for (let idx = 0; idx < MAX_NUM_RASTERS; idx++) {
      const ptr = idx * RASTER_REC_LEN;
      const speed = this.Avatar.rasters[ptr + 2];
      this.Avatar.rasters[ptr] += speed * deltaSec;
      if (this.Avatar.rasters[ptr] > this.Avatar.height) {
        this.Avatar.rasters[ptr] = 0;
      }
      if (this.Avatar.rasters[ptr] < 0) {
        this.Avatar.rasters[ptr] = this.Avatar.height;
      }
    }
  }
}

const PI2 = Math.PI * 2.0;

function ellipsePolygon(
  centerX,
  centerY,
  a,
  b,
  numPoints,
  angleStart,
  angleEnd
) {
  const angleStep = (angleEnd - angleStart) / numPoints;
  const points = [];
  for (let angle = angleStart; angle <= angleEnd; angle += angleStep) {
    const x = a * Math.cos(angle) + centerX;
    const y = b * Math.sin(angle) + centerY;
    points.push(new PIXI.Point(x, y));
  }
  return new PIXI.Polygon(points);
}

class AvatarSprite {
  static defaultOptions = {};

  constructor(world, options = {}) {
    this.options = { ...this.constructor.defaultOptions, ...options };

    const g = new Graphics();

    const gTexture = new Graphics();
    g.addChild(gTexture);

    const gMask = new Graphics();
    gTexture.addChild(gMask);
    gTexture.mask = gMask;
   
    gMask.clear();

    const a = 50;
    const b = 100;

    gMask.drawCircle(0, 0, 25);
    gMask.lineStyle(1.5, 0xffffff, 1);
    gMask.beginFill(0xffffff);
    gMask.drawPolygon(
      ellipsePolygon(0, 0 - a * 0.33, a * 0.66, a * 0.66, 12, 0, PI2)
    );
    gMask.drawPolygon(ellipsePolygon(0, b, a, b, 14, PI2 / 2, PI2));

    Object.assign(this, { g, gMask, gTexture });
  }

  root() {
    return this.g;
  }

  update(world, entity) {
    const {
      Position: { x, y, r },
    } = entity;

    const { g, gTexture } = this;
    g.x = x;
    g.y = y;
    g.rotation = r;

    gTexture.clear();

    for (let idx = 0; idx < MAX_NUM_RASTERS; idx++) {
      const ptr = idx * RASTER_REC_LEN;
      const y = entity.Avatar.rasters[ptr] - (entity.Avatar.height / 2);
      const color = entity.Avatar.rasters[ptr + 1];
      gTexture.lineStyle(1.5, Math.floor(color), 1.0);
      gTexture.moveTo(0 - entity.Avatar.width / 2, y);
      gTexture.lineTo(entity.Avatar.width / 2, y);      
    }

    window.avatar = entity;
  }
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
