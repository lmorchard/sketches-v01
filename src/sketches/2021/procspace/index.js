import {
  mkrng,
  genid,
  genName,
  rngRange,
  rngChoose,
  rngSign,
  rngIntRange,
  rngTableSelector,
} from "../../../lib/randoms";

import { value, take, skip } from "../../../lib/generators";

async function main() {
  console.log("READY.");

  const universe = new Universe({
    seed: "hello world",
  });
  console.log(universe.toString());
  for (const system of take(skip(universe.starSystems(), 100), 10)) {
    console.log("\t" + system.toString());
    for (const star of system.stars()) {
      console.log("\t\t" + star.toString());
    }
    for (const planet of system.planets()) {
      console.log("\t\t" + planet.toString());
    }
  }
}

class BaseGen {
  constructor(props = {}) {
    const seed = props.seed;
    const rng = props.rng || mkrng(seed);
    const {
      id = genid(rng),
      type = this.constructor.name,
      name = genName(rng),
    } = props;
    Object.assign(this, {
      id,
      name,
      type,
      seed,
      rng,
    });
  }

  toString() {
    return `${this.type} ${this.id.toString(16)} ${this.name}`;
  }
}

class Universe extends BaseGen {
  constructor(props = {}) {
    super(props);
    this.systemsRng = mkrng(this.rng());
  }

  *starSystems() {
    while (true) {
      yield this.starSystem(this.systemsRng());
    }
  }

  starSystem(seed) {
    return new StarSystem({ seed });
  }
}

class StarSystem extends BaseGen {
  static starDistributions = {
    1: 10,
    2: 2,
    3: 1,
  };

  constructor(props = {}) {
    super(props);

    this.starsSeed = this.rng();
    this.numStars = rngTableSelector(
      this.constructor.starDistributions,
      this.rng
    )();

    this.planetsSeed = this.rng();
    this.numPlanets = rngIntRange(0, 10, this.rng);
  }

  *stars() {
    const rng = mkrng(this.starsSeed);
    for (let idx = 0; idx < this.numStars; idx++) {
      yield this.star(rng());
    }
  }

  star(seed) {
    return new Star({ seed });
  }

  *planets() {
    const rng = mkrng(this.planetsSeed);
    for (let idx = 0; idx < this.numPlanets; idx++) {
      yield this.planet(rng());
    }
  }

  planet(seed) {
    return new Planet({ seed });
  }
}

class Star extends BaseGen {
  constructor(props = {}) {
    super(props);
  }
}

class Planet extends BaseGen {
  constructor(props = {}) {
    super(props);
  }
}

main().catch(console.error);
