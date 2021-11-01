import { defineQuery, defineComponent, Types } from "../../../../vendor/pkg/bitecs.js";
import { SmoothGraphics as Graphics } from "../../../../vendor/pkg/@pixi/graphics-smooth.js";
import { BaseEntityProxy } from "../../../../lib/ecsUtils.js";
import { Position, Velocity } from "../../../../lib/positionMotion.js";

import FontFutural from "../../../../fonts/futural.json.proxy.js";
// import FontFuturam from "../../../../fonts/futuram.json";
// import FontScripts from "../../../../fonts/scripts.json";
// import FontScriptc from "../../../../fonts/scriptc.json";
import FontRowmant from "../../../../fonts/rowmant.json.proxy.js";

const ORACLE_SYMBOL_FONT = FontFutural;
//const ORACLE_SYMBOL_FONT = FontRowmant;

export const ORACLE_SYMBOL_AREAS = {
  LINE_1: 1,
  LINE_2: 2,
  LINE_3: 3,
};

export const ORACLE_SYMBOL_LINE_1 = "ABCDEFGHIJKLM";
export const ORACLE_SYMBOL_LINE_2 = "NOPQRSTUVWXYZ";
export const ORACLE_SYMBOL_LINE_3 = "0123456789";

export const OracleSymbol = defineComponent({
  char: Types.ui8,
  area: Types.ui8,
  order: Types.ui8,
  scale: Types.f32,
});

export const oracleSymbolQuery = defineQuery([
  Position,
  Velocity,
  OracleSymbol,
]);

export class OracleSymbolEntity extends BaseEntityProxy {
  static components = {
    Position,
    Velocity,
    OracleSymbol,
  };

  update(world) {
    const {
      renderer: { width, height },
    } = world;

    this.OracleSymbol.scale = width / 700;

    const { area, order, scale } = this.OracleSymbol;
    switch (area) {
      case ORACLE_SYMBOL_AREAS.LINE_1: {
        const count = ORACLE_SYMBOL_LINE_1.length;
        const startY = 0 - (42 * scale);
        const startX = 0 - (width / 2.0) * 0.6;
        const endX = (width / 2.0) * 0.6;
        const stepX = (endX - startX) / (count - 1);
        this.Position.x = startX + stepX * order;
        this.Position.y = startY;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_2: {
        const count = ORACLE_SYMBOL_LINE_2.length;
        const startY = 0;
        const startX = 0 - (width / 2.0) * 0.6;
        const endX = (width / 2.0) * 0.6;
        const stepX = (endX - startX) / (count - 1);
        this.Position.x = startX + stepX * order;
        this.Position.y = startY;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_3: {
        const count = ORACLE_SYMBOL_LINE_3.length;
        const startY = (42 * scale);
        const startX = 0 - (width / 2.0) * 0.4;
        const endX = (width / 2.0) * 0.4;
        const stepX = (endX - startX) / (count - 1);
        this.Position.x = startX + stepX * order;
        this.Position.y = startY;
        break;
      }
    }
  }
}

export class OracleSymbolGlyph {
  constructor(world, symbolEntity) {
    const char = String.fromCharCode(symbolEntity.OracleSymbol.char);
    this.g = renderGlyph(ORACLE_SYMBOL_FONT, char);
  }

  root() {
    return this.g;
  }

  update(world, symbolEntity) {
    const { g } = this;
    const { Position, OracleSymbol } = symbolEntity;
    g.x = Position.x;
    g.y = Position.y;
    g.scale.x = OracleSymbol.scale;
    g.scale.y = OracleSymbol.scale;
  }
}

const glyphCache = new Map();
function renderGlyph(font, char) {
  const cacheKey = `${font.name}:${char}`;
  if (!glyphCache.has(cacheKey)) {
    const glyph = font.glyphs[char];
    const g = new Graphics();
    g.lineStyle(2, 0xffaa33, 1);
    for (const line of glyph.lines) {
      if (line.length === 0) continue;
      g.moveTo(line[0][0], line[0][1]);
      for (let lineIdx = 1; lineIdx < line.length; lineIdx++) {
        g.lineTo(line[lineIdx][0], line[lineIdx][1]);
      }
    }
    glyphCache.set(cacheKey, g);
  }
  return glyphCache.get(cacheKey).clone();
}
