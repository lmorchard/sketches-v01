import {
  addEntity,
  addComponent,
  pipe,
  defineQuery,
  defineComponent,
  Types,
} from "bitecs";
import { hslToRgb } from "../../../../lib/hslToRgb.js";
import { lerp } from "../../../../lib/transitions.js";
import easings from "../../../../lib/easings.js";
import { rngIntRange } from "../../../../lib/randoms.js";
import * as Stats from "../../../../lib/stats.js";
import * as World from "../../../../lib/world.js";
import * as Viewport from "../../../../lib/viewport/pixi.js";
import { setupTwiddles } from "../../../twiddles.js";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";

async function main() {
  const stats = Stats.init();
  const world = World.init();
  const viewport = Viewport.init();
  viewport.gridEnabled = false;

  const { pane, paneUpdateSystem } = setupTwiddles(world, viewport, false);

  const g = (world.gRaster = new Graphics());
  viewport.stage.addChild(g);

  const cycleEid = spawnDayNightCycle(world);
  pane.addMonitor(DayNightCycle.currentTime, cycleEid, {
    label: "currentTime",
  });

  const pipeline = pipe(
    dayNightCycleSystem,
    roadSystem(viewport),
    skySystem(viewport),
    paneUpdateSystem
  );
  world.run(pipeline, viewport, stats);
  console.log("READY.");
}

const ROAD_COLORS = {
  grass: [70 / 360, 0.82, 0.39],
  road: [146 / 360, 0.04, 0.32],
};

const roadSystem = (viewport) => (world) => {
  if (!world.gRoad) {
    world.gRoad = new Graphics();
    viewport.stage.addChild(world.gRoad);
    console.log(viewport.renderer.height / 2);
  }

  const { gRoad: g } = world;

  const yStart = 0;
  const yEnd = viewport.renderer.height / 2;
  const xRight = viewport.renderer.width / 2;
  const xLeft = 0 - xRight;
  const roadWidthFar = viewport.renderer.width * 0.125;
  const roadWidthNear = viewport.renderer.width * 1.25;

  g.clear();

  for (let y = yStart; y < yEnd; y += 4) {
    const perc = (y - yStart) / (yEnd - yStart);

    const roadWidth = lerp(roadWidthFar, roadWidthNear, perc);
    const roadLeft = 0 - roadWidth * 0.75;
    const roadRight = 0 + roadWidth * 0.25;
    const roadCenter = roadLeft + roadWidth / 2;

    const grassColor = hslToRgb(...ROAD_COLORS.grass);
    const roadColor = hslToRgb(...ROAD_COLORS.road);

    g.lineStyle(1, grassColor, 1);
    g.moveTo(xLeft, y);
    g.lineTo(roadLeft, y);

    g.lineStyle(1, roadColor, 1);
    g.lineTo(roadRight, y);

    g.lineStyle(1, grassColor, 1);
    g.lineTo(xRight, y);

    if ((y / 10) % 2) {
      g.lineStyle(1, 0xffffff, 1);
      g.moveTo(roadCenter - 5, y);
      g.lineTo(roadCenter + 5, y);
    }
  }

  return world;
};

const SKY_COLORS = {
  sunrise: [
    [36 / 360, 0.9, 0.6],
    [201 / 360, 0.1, 0.1],
  ],
  day: [
    [193 / 360, 0.74, 0.59],
    [215 / 360, 0.89, 0.44],
  ],
  sunset: [
    [32 / 360, 1.0, 0.5],
    [235 / 360, 0.28, 0.57],
  ],
  evening: [
    [265 / 360, 0.8, 0.3],
    [201 / 360, 0.5, 0.2],
  ],
  night: [
    [201 / 360, 0.1, 0.1],
    [1 / 360, 0.1, 0.1],
  ],
};

const skySystem = (viewport) => (world) => {
  if (!world.gSky) {
    world.gSky = new Graphics();
    viewport.stage.addChild(world.gSky);
  }

  const { gSky: g } = world;

  const cEid = dayNightCycleQuery(world)[0];
  const {
    secondsPerSecond,
    sunriseTime,
    noonTime,
    sunsetTime,
    nightTime,
    currentTime,
    eveningTime,
    isDay,
  } = DayNightCycle;

  // TODO: condense this down into a simpler abstract algo?
  let periodStartColor, periodEndColor, periodProgress;
  if (
    currentTime[cEid] >= sunriseTime[cEid] &&
    currentTime[cEid] < noonTime[cEid]
  ) {
    periodStartColor = SKY_COLORS.sunrise;
    periodEndColor = SKY_COLORS.day;
    periodProgress =
      (currentTime[cEid] - sunriseTime[cEid]) /
      (noonTime[cEid] - sunriseTime[cEid]);
  } else if (
    currentTime[cEid] >= noonTime[cEid] &&
    currentTime[cEid] < sunsetTime[cEid]
  ) {
    periodStartColor = SKY_COLORS.day;
    periodEndColor = SKY_COLORS.sunset;
    periodProgress =
      (currentTime[cEid] - noonTime[cEid]) /
      (sunsetTime[cEid] - noonTime[cEid]);
  } else if (
    currentTime[cEid] >= sunsetTime[cEid] &&
    currentTime[cEid] < eveningTime[cEid]
  ) {
    periodStartColor = SKY_COLORS.sunset;
    periodEndColor = SKY_COLORS.evening;
    periodProgress =
      (currentTime[cEid] - sunsetTime[cEid]) /
      (eveningTime[cEid] - sunsetTime[cEid]);
  } else if (
    currentTime[cEid] >= eveningTime[cEid] &&
    currentTime[cEid] < nightTime[cEid]
  ) {
    periodStartColor = SKY_COLORS.evening;
    periodEndColor = SKY_COLORS.night;
    periodProgress =
      (currentTime[cEid] - eveningTime[cEid]) /
      (nightTime[cEid] - eveningTime[cEid]);
  } else if (currentTime[cEid] >= nightTime[cEid]) {
    periodStartColor = SKY_COLORS.night;
    periodEndColor = SKY_COLORS.night;
    periodProgress = 1.0;
  } else if (currentTime[cEid] <= sunriseTime[cEid]) {
    periodStartColor = SKY_COLORS.night;
    periodEndColor = SKY_COLORS.sunrise;
    periodProgress = currentTime[cEid] / sunriseTime[cEid];
  }

  const [[pshH, pshS, pshL], [pszH, pszS, pszL]] = periodStartColor;
  const [[pehH, pehS, pehL], [pezH, pezS, pezL]] = periodEndColor;
  const [horizonH, horizonS, horizonL] = [
    lerp(pshH, pehH, periodProgress),
    lerp(pshS, pehS, periodProgress),
    lerp(pshL, pehL, periodProgress),
  ];
  const [zenithH, zenithS, zenithL] = [
    lerp(pszH, pezH, periodProgress),
    lerp(pszS, pezS, periodProgress),
    lerp(pszL, pezL, periodProgress),
  ];

  g.clear();

  const yStart = 0;
  const yEnd = 0 - viewport.renderer.height / 2;
  const xRight = viewport.renderer.width / 2;
  const xLeft = 0 - xRight;

  for (let y = yStart; y > yEnd; y -= 4) {
    const perc = (y - yStart) / (yEnd - yStart);

    const easing = (x) => x; //easings.easeOutExpo; //(x) => x;
    const h = lerp(horizonH, zenithH, easing(perc));
    const s = lerp(horizonS, zenithS, easing(perc));
    const l = lerp(horizonL, zenithL, easing(perc));

    const color = hslToRgb(h, s, l);

    g.lineStyle(1, color, 1);
    g.moveTo(xLeft, y);
    g.lineTo(xRight, y);
  }

  return world;
};

const DayNightCycle = defineComponent({
  secondsPerSecond: Types.f32,
  currentTime: Types.f32,
  sunriseTime: Types.f32,
  noonTime: Types.f32,
  sunsetTime: Types.f32,
  eveningTime: Types.f32,
  nightTime: Types.f32,
  isDay: Types.ui8,
});

const dayNightCycleQuery = defineQuery([DayNightCycle]);

const dayNightCycleDefaults = {
  secondsPerSecond: 1440,
  currentTime: 12 * 60 * 60,
  sunriseTime: 6.5 * 60 * 60,
  noonTime: 12 * 60 * 60,
  sunsetTime: 16 * 60 * 60,
  eveningTime: 16.5 * 60 * 60,
  nightTime: 24 * 60 * 60,
};

const spawnDayNightCycle = (world, props = {}) => {
  const eid = addEntity(world);
  addComponent(world, DayNightCycle, eid);
  for (const [name, value] of Object.entries({
    ...dayNightCycleDefaults,
    ...props,
  })) {
    DayNightCycle[name][eid] = value;
  }
  return eid;
};

const SECONDS_PER_DAY = 60 * 60 * 24;

const dayNightCycleSystem = (world) => {
  const { secondsPerSecond, sunsetTime, sunriseTime, currentTime, isDay } =
    DayNightCycle;
  const {
    time: { deltaSec },
  } = world;
  for (const eid of dayNightCycleQuery(world)) {
    currentTime[eid] += secondsPerSecond[eid] * deltaSec;
    if (currentTime[eid] > SECONDS_PER_DAY) {
      currentTime[eid] = 0;
    }
    isDay[eid] =
      currentTime[eid] > sunriseTime[eid] && currentTime[eid] < sunsetTime[eid]
        ? 1
        : 0;
  }
  return world;
};

main().catch(console.error);
