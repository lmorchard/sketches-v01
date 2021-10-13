import {
  addEntity,
  addComponent,
  pipe,
  defineQuery,
  defineComponent,
  Types,
} from "../../../../vendor/pkg/bitecs.js";
import { hslToRgb } from "../../../../lib/hslToRgb.js";
import { lerp } from "../../../../lib/transitions.js";
import easings from "../../../../lib/easings.js";
import { rngIntRange } from "../../../../lib/randoms.js";
import * as Stats from "../../../../lib/stats.js";
import * as World from "../../../../lib/world.js";
import * as Viewport from "../../../../lib/viewport/pixi.js";
import { setupTwiddles } from "../../../twiddles.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";

async function main() {
  const stats = Stats.init();
  const world = World.init();
  const viewport = Viewport.init();
  viewport.gridEnabled = false;

  const { pane, paneUpdateSystem } = setupTwiddles(world, viewport, false);

  const g = (world.gRaster = new Graphics());
  viewport.stage.addChild(g);

  const cycle = DayNightCycleProxy.spawn(world);
  pane.addMonitor(cycle, "currentTime");
  pane.addMonitor(cycle, "dayPeriodName");
  pane.addMonitor(cycle, "dayPeriodProgress");
  pane.addMonitor(cycle, "dayPeriodNextName");

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

const skySystem = (viewport) => (world) => {
  if (!world.gSky) {
    world.gSky = new Graphics();
    viewport.stage.addChild(world.gSky);
  }

  const { gSky: g } = world;

  const eid = dayNightCycleQuery(world)[0];
  const cycle = new DayNightCycleProxy(eid);

  const periodStartColor = skySystem.colors[cycle.dayPeriodName];
  const periodEndColor = skySystem.colors[cycle.dayPeriodNextName];
  const periodProgress = cycle.dayPeriodProgress;

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

skySystem.colors = {
  night: [
    [201 / 360, 0.1, 0.1],
    [1 / 360, 0.1, 0.1],
  ],
  sunrise: [
    [36 / 360, 0.9, 0.6],
    [201 / 360, 0.1, 0.1],
  ],
  noon: [
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
};

class BaseComponentProxy {
  constructor(eid) {
    this.eid = eid;
    const defaults = this.constructor.defaults();
    Object.keys(defaults).forEach((name) => {
      if (this[name]) return;
      Object.defineProperty(this, name, {
        get: () => this.constructor.component[name][this.eid],
        set: (value) => (this.constructor.component[name][this.eid] = value),
      });
    });
  }

  static spawn(world, props = {}) {
    const eid = addEntity(world);
    addComponent(world, this.component, eid);

    const proxy = new this(eid);
    for (const [name, value] of Object.entries({
      ...this.defaults(),
      ...props,
    })) {
      proxy[name] = value;
    }

    return proxy;
  }
}

class DayNightCycleProxy extends BaseComponentProxy {
  static component = defineComponent({
    secondsPerSecond: Types.f32,
    currentTime: Types.f32,
    dayPeriodIdx: Types.ui8,
    dayPeriodProgress: Types.f32,
    dayPeriods: [Types.f32, 6],
  });
  static defaults() {
    return {
      secondsPerSecond: 1440,
      currentTime: 12 * 60 * 60,
      dayPeriodIdx: 0,
      dayPeriodProgress: 0,
      dayPeriods: [0, 6, 12, 16, 18, 24].map((hours) => hours * 60 * 60),
    };
  }
  static periodNames = [
    "night",
    "sunrise",
    "noon",
    "sunset",
    "evening",
    "night",
  ];
  set dayPeriods(val) {
    this.constructor.component.dayPeriods[this.eid].set(val);
  }
  get dayPeriods() {
    return this.constructor.component.dayPeriods[this.eid];
  }
  get dayPeriodName() {
    return this.constructor.periodNames[this.dayPeriodIdx];
  }
  get dayPeriodNextName() {
    return (
      this.constructor.periodNames[this.dayPeriodIdx + 1] ||
      this.constructor.periodNames[0]
    );
  }
}

const dayNightCycleQuery = defineQuery([DayNightCycleProxy.component]);

const SECONDS_PER_DAY = 60 * 60 * 24;

const dayNightCycleSystem = (world) => {
  const {
    time: { deltaSec },
  } = world;

  const cycle = new DayNightCycleProxy();
  for (const eid of dayNightCycleQuery(world)) {
    cycle.eid = eid;
    cycle.currentTime += cycle.secondsPerSecond * deltaSec;
    if (cycle.currentTime > SECONDS_PER_DAY) {
      cycle.currentTime = 0;
    }
    for (let idx = cycle.dayPeriods.length - 1; idx >= 0; idx--) {
      if (cycle.currentTime >= cycle.dayPeriods[idx]) {
        cycle.dayPeriodIdx = idx;
        break;
      }
    }
    const startPeriod = cycle.dayPeriods[cycle.dayPeriodIdx];
    const endPeriod =
      cycle.dayPeriods[cycle.dayPeriodIdx + 1] || SECONDS_PER_DAY;
    cycle.dayPeriodProgress =
      (cycle.currentTime - startPeriod) / (endPeriod - startPeriod);
  }
  return world;
};

main().catch(console.error);
