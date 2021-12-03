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

export const rngTableSelector = (table, rng) => {
  let totalChance = Object.values(table).reduce(
    (total, curr) => total + curr,
    0
  );
  return () => {
    let choiceIdx = totalChance * rng();
    for (const [choice, chance] of Object.entries(table)) {
      choiceIdx -= chance;
      if (choiceIdx <= 0) return choice;
    }
  };
};

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

// Stolen from / inspired by Text Elite from Ian Bell
// www.iancgbell.clara.net/elite/text/
const pairs =
  "..LEXEGEZACEBISOUSESARMAINDIREA.ERATENBERALAVETIEDORQUANTEISRION";
const pairsCount = Math.floor(pairs.length / 2);
export function genName(rng) {
  let name = "";
  const rounds = 2 + Math.floor(rng() * 3);
  for (let round = 0; round < rounds; round++) {
    const idx = Math.floor(rng() * pairsCount) * 2;
    name += pairs.substring(idx, idx + 2);
  }
  name = name.replace(/\./g, "");
  return name.substring(0, 1) + name.substring(1).toLowerCase();
}

export let rngClass = seedrandom;
export let globalRng = mkrng("default");
