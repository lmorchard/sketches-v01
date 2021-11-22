import { pipe } from "bitecs";
import * as World from "../../../lib/world.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { movementSystem } from "../../../lib/positionMotion";
import { updateEntities, updateSprites } from "../../../lib/ecsUtils";
import { autoSizedRenderer, gridRenderer } from "../../../lib/viewport/pixi.js";
import { Pane } from "tweakpane";
import { avatarQuery, AvatarEntity, AvatarSprite } from "./Avatar.js";

async function main() {
  const world = World.init();

  const renderOptions = {};

  const { paneUpdateSystem } = setupTwiddles({ world });

  world.run(
    pipe(avatarUpdateSystem(), movementSystem, paneUpdateSystem),
    pipe(
      autoSizedRenderer(renderOptions),
      avatarRenderer(renderOptions),
      gridRenderer()
    )
  );

  for (let y = -300; y <= 300; y += 150) {
    for (let x = -450; x <= 450; x += 150) {
      AvatarEntity.spawn(world, {
        Avatar: { width: 100, height: 100, seed: y * 1000 + x },
        Position: { x, y },
      });
    }
  }

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
