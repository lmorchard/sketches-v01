import { Types, defineComponent, defineQuery } from "bitecs";

export const Vector4 = {
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  r: Types.f32,
};

export const Position = defineComponent(Vector4);

export const Velocity = defineComponent(Vector4);

export const movementQuery = defineQuery([Position, Velocity]);

export const movementSystem = (world) => {
  const {
    time: { deltaSec },
  } = world;
  for (const eid of movementQuery(world)) {
    Position.x[eid] += Velocity.x[eid] * deltaSec;
    Position.y[eid] += Velocity.y[eid] * deltaSec;
    Position.z[eid] += Velocity.z[eid] * deltaSec;
    Position.r[eid] += Velocity.r[eid] * deltaSec;
  }
  return world;
};

export const bouncerSystem = (world) => {
  for (const eid of movementQuery(world)) {
    if (Position.x[eid] > 400 || Position.x[eid] < -400) {
      Velocity.x[eid] = 0 - Velocity.x[eid];
    }
    if (Position.y[eid] > 400 || Position.y[eid] < -400) {
      Velocity.y[eid] = 0 - Velocity.y[eid];
    }
    if (Position.z[eid] > 400 || Position.z[eid] < -400) {
      Velocity.z[eid] = 0 - Velocity.z[eid];
    }
  }
  return world;
};
