import { Types, defineComponent, defineQuery } from "../../vendor/pkg/bitecs.NAhENCKzJOVt.js";
import { Position } from "../positionMotion.l-PS2cXo6TSL.js";

export const Renderable = defineComponent({
  visible: Types.i8,
  shape: Types.i8,
  color: Types.ui32,
  mouseOver: Types.i8,
  mouseDown: Types.i8,
  mouseClicked: Types.i8,
  mouseClickedSeen: Types.i8,
});

export const renderQuery = defineQuery([Position, Renderable]);

export const CameraFocus = defineComponent();

export const cameraFocusQuery = defineQuery([Position, CameraFocus]);

export const RenderableShapes = [
  "Default",
  "Ball",
  "Node",
  "GatewayNode",
  "StorageNode",
  "FirewallNode",
  "HubNode",
  "TerminalNode",
  "WalletNode",
  "ICENode",
];

export const RenderableShape = RenderableShapes.reduce(
  (acc, name, idx) => ({
    ...acc,
    [name]: idx,
  }),
  {}
);
