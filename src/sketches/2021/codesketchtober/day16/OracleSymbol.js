import { defineQuery, defineComponent, Types } from "bitecs";
import { SmoothGraphics as Graphics } from "@pixi/graphics-smooth";
import { BaseEntityProxy } from "../../../../lib/ecsUtils";
import { Position, Velocity } from "../../../../lib/positionMotion";

import FontFutural from "../../../../fonts/futural.json";
// import FontFuturam from "../../../../fonts/futuram.json";
// import FontScripts from "../../../../fonts/scripts.json";
// import FontScriptc from "../../../../fonts/scriptc.json";
import FontRowmant from "../../../../fonts/rowmant.json";

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
    const { area, order } = this.OracleSymbol;
    switch (area) {
      case ORACLE_SYMBOL_AREAS.LINE_1: {
        const count = ORACLE_SYMBOL_LINE_1.length;
        /*
        const radius = 2200;
        const cy = 1900;
        const cx = 0;
        const startT = (0 - Math.PI * 0.5) - Math.PI / 13;
        const endT = (0 - Math.PI * 0.5) + Math.PI / 13;
        const stepT = (endT - startT) / count;
        const t = startT + stepT * order;
        entity.Position.x = cx + Math.cos(t) * radius;
        entity.Position.y = cy + Math.sin(t) * radius;
        */
        const startY = 0 - (height / 2.0) * 0.4;
        const startX = 0 - (width / 2.0) * 0.8;
        const endX = (width / 2.0) * 0.8;
        const stepX = (endX - startX) / (count - 1);
        this.Position.x = startX + stepX * order;
        this.Position.y = startY;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_2: {
        const count = ORACLE_SYMBOL_LINE_2.length;
        /*
        const radius = 2200;
        const cy = 2050;
        const cx = 0;
        const startT = (0 - Math.PI * 0.5) - Math.PI / 13;
        const endT = (0 - Math.PI * 0.5) + Math.PI / 13;
        const stepT = (endT - startT) / count;
        const t = startT + stepT * order;
        entity.Position.x = cx + Math.cos(t) * radius;
        entity.Position.y = cy + Math.sin(t) * radius;
        */
        const startY = 0 - (height / 2.0) * 0.1;
        const startX = 0 - (width / 2.0) * 0.8;
        const endX = (width / 2.0) * 0.8;
        const stepX = (endX - startX) / (count - 1);
        this.Position.x = startX + stepX * order;
        this.Position.y = startY;
        break;
      }
      case ORACLE_SYMBOL_AREAS.LINE_3: {
        const count = ORACLE_SYMBOL_LINE_3.length;
        const startY = (height / 2.0) * 0.33;
        const startX = 0 - (width / 2.0) * 0.5;
        const endX = (width / 2.0) * 0.5;
        const stepX = (endX - startX) / (count - 1);
        this.Position.x = startX + stepX * order;
        this.Position.y = startY;
        break;
      }
    }
  }
}

export class OracleSymbolGlyph {
  constructor(world, symbolEntity, options = {}) {
    const char = String.fromCharCode(symbolEntity.OracleSymbol.char);
    //this.g = renderGlyph(FontFutural, char);
    this.g = renderGlyph(FontRowmant, char);
  }

  root() {
    return this.g;
  }

  update(world, symbolEntity) {
    const { g } = this;
    const { Position } = symbolEntity;
    g.x = Position.x;
    g.y = Position.y;
    g.scale.x = 2.0;
    g.scale.y = 2.0;
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
