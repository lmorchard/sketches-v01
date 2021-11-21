import { addEntity, addComponent } from "../vendor/pkg/bitecs.js";

export class BaseEntityProxy {
  static components = {};
  static defaults = {};

  static spawn(world, props = {}) {
    const eid = addEntity(world);
    const proxy = new this(eid);
    const defaults = this.defaults;
    const components = Object.entries(this.components);

    for (const [componentName, component] of components) {
      addComponent(world, component, eid);
      const componentDefaults = {
        ...defaults[componentName],
        ...props[componentName],
      };
      Object.entries(componentDefaults).forEach(([name, value]) => {
        proxy[componentName][name] =
          typeof value === "function" ? value() : value;
      });
    }

    return proxy;
  }

  constructor(eid) {
    this.eid = eid;
    const components = Object.entries(this.constructor.components);
    for (const [componentName, component] of components) {
      if (!this[componentName]) this[componentName] = {};
      const proxy = this[componentName];
      Object.keys(component).forEach((name) => {
        defineComponentProperty(this, proxy, component, name);
      });
    }
  }
}

export class GenericComponentProxy {
  constructor(component, eid) {
    this.eid = eid;
    defineComponentProperties(this, this, component);
  }
}

export class BaseComponentProxy {
  static component = null;
  constructor(eid) {
    this.eid = eid;
    defineComponentProperties(this, this, this.constructor.component);
  }
}

export function defineComponentProperties(parent, proxy, component) {
  Object.keys(component).forEach((name) => {
    defineComponentProperty(parent, proxy, component, name);
  });
}

export function defineComponentProperty(parent, proxy, component, name) {
  if (proxy[name]) return;
  Object.defineProperty(proxy, name, {
    get: () => component[name][parent.eid],
    set: (value) => (component[name][parent.eid] = value),
  });
}

export function updateEntities(world, updates) {
  for (const [query, Entity, customUpdate = () => {}] of updates) {
    const eids = query(world);
    const entity = new Entity();
    for (const eid of eids) {
      entity.eid = eid;
      customUpdate(entity);
      entity.update(world);
    }
  } 
  return world;
}

export function updateSprites(world, g, spriteUpdates) {
  for (const [query, Entity, Sprite, spriteMapName] of spriteUpdates) {
    if (!world[spriteMapName]) {
      world[spriteMapName] = new Map();
    }
    const spriteMap = world[spriteMapName];
    const eids = query(world);
    const entity = new Entity();
    for (const eid of eids) {
      entity.eid = eid;
      if (!spriteMap.has(eid)) {
        const sprite = new Sprite(world, entity);
        g.addChild(sprite.root());
        spriteMap.set(eid, sprite);
      }
      spriteMap.get(eid).update(world, entity, eids);
    }
    for (const eid of spriteMap.keys()) {
      if (!eids.includes(eid)) {
        g.removeChild(spriteMap.get(eid).root());
        spriteMap.delete(eid);
      }
    }
  }
  return world;
}
