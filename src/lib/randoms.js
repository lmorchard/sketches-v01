import seedrandom from "seedrandom";

export function setGlobalRngClass(cls) {
  rngClass = cls;
}

export function setGlobalRng(rng) {
  globalRng = rng;
}

export function getGlobalRng() {
  return globalRng;
}

export function mkrng(seed) {
  return new rngClass(seed);
}

export const rngRange = (min, max, rng = globalRng) =>
  rng() * (max - min) + min;

export const rngIntRange = (min, max, rng = globalRng) =>
  Math.floor(rng() * (max + 1 - min) + min);

export const rngChoose = (list, rng = globalRng) =>
  list[rngIntRange(0, list.length - 1, rng)];

export const rngSign = (rng) => (rng() > 0.5 ? 1 : -1);

export const genid = (rng = globalRng) => Math.floor(rng() * 0xffffffff);

export const genHex = (rng = globalRng) =>
  Math.floor(rng() * 0xffff)
    .toString(16)
    .padStart(4, "0");

export const genUniqueHex = (prefix, obj, rng = globalRng) => {
  let addr;
  do {
    addr = `${prefix}:${genHex(rng)}`;
  } while (addr in obj);
  return addr;
};

export let rngClass = seedrandom;
export let globalRng = mkrng("default");
