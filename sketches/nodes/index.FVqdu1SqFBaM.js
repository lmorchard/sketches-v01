import { addComponent, pipe, removeComponent, hasComponent } from "../../vendor/pkg/bitecs.NAhENCKzJOVt.js";
import * as Stats from "../../lib/stats.kmT9S2XHaHWD.js";
import * as World from "../../lib/world.LNwdjn2kAWyp.js";
import * as Viewport from "../../lib/viewport/pixi.h5vEDTNcChhr.js";
import {
  CameraFocus,
  Renderable,
  renderQuery,
  cameraFocusQuery,
} from "../../lib/viewport/index.CpZuvs6nLZ_y.js";
import { movementSystem } from "../../lib/positionMotion.l-PS2cXo6TSL.js";
import {
  init as initGraphLayout,
  graphLayoutSystem,
  GraphLayoutNode,
} from "../../lib/graphLayout.qnVThRlidVkI.js";
import {
  init as initNetworks,
  spawnEntitiesForNetwork,
  networkGraphLayoutSystem,
  Network,
  GatewayNode,
  StorageNode,
  FirewallNode,
  HubNode,
  TerminalNode,
  WalletNode,
  ICENode,
  NetworkNodeState,
  NetworkState,
} from "../../lib/networks.6E3Scf9oiDX3.js";
import { setGlobalRng, mkrng, rngIntRange, genHex } from "../../lib/randoms.Tx30J0bbJd9y.js";
import { setupTwiddles } from "../twiddles.ik1Q5cV1Vv7g.js";

async function main() {
  setGlobalRng(mkrng("hello"));

  const stats = Stats.init();
  const viewport = Viewport.init();
  const world = World.init();

  Object.assign(window, {
    world,
    NetworkState,
    NetworkNodeState,
    GraphLayoutNode,
  });

  initNetworks(world);
  initGraphLayout(world);

  const network1 = new Network();
  const nodes = network1.add(
    new GatewayNode(),
    new FirewallNode(),
    new HubNode(),
    new StorageNode(),
    new StorageNode(),
    new StorageNode(),
    new WalletNode(),
    new HubNode(),
    new TerminalNode(),
    new TerminalNode(),
    new TerminalNode(),
    new TerminalNode(),
    new ICENode()
  );
  const [
    gateway,
    firewall,
    storageHub,
    storage1,
    storage2,
    storage3,
    wallet1,
    terminalHub,
    terminal1,
    terminal2,
    terminal3,
    terminal4,
    ice1,
  ] = nodes;

  gateway.connect(firewall);
  firewall.connect(storageHub, terminalHub, ice1);
  storageHub.connect(storage1, storage2, storage3, wallet1);
  terminalHub.connect(terminal1, terminal2, terminal3, terminal4);

  const networkEid = spawnEntitiesForNetwork(world, network1);
  NetworkState.active[networkEid] = true;

  const gatewayEid = world.nodeIdToEntityId[gateway.id];
  NetworkNodeState.visible[gatewayEid] = true;

  // TODO: despawn scene for transition

  addComponent(world, CameraFocus, world.nodeIdToEntityId[gateway.id]);

  const focusSelectionSystem = (world) => {
    const renderables = renderQuery(world);
    const clickedEid = renderables.find((eid) => Renderable.mouseClicked[eid]);
    if (clickedEid) {
      const cameraFocusEid = cameraFocusQuery(world)[0];
      if (cameraFocusEid && cameraFocusEid !== clickedEid) {
        removeComponent(world, CameraFocus, cameraFocusEid);
      }
      addComponent(world, CameraFocus, clickedEid);

      const networkId = NetworkNodeState.networkId[clickedEid];
      const network = world.networks[networkId];
      const nodeId = NetworkNodeState.nodeId[clickedEid];
      const node = network.children[nodeId];
      for (const connectedId in node.connections) {
        const connectedEid = world.nodeIdToEntityId[connectedId];
        if (
          connectedEid &&
          hasComponent(world, NetworkNodeState, connectedEid)
        ) {
          NetworkNodeState.visible[connectedEid] = true;
        }
      }
    }

    return world;
  };

  const { pane, paneUpdateSystem } = setupTwiddles(world, viewport);
  // setupBloomTwiddles(pane, viewport);
  //pane.addButton({ title: "Spawn" }).on("click", spawnNewNode);

  const pipeline = pipe(
    networkGraphLayoutSystem,
    graphLayoutSystem,
    movementSystem,
    focusSelectionSystem,
    paneUpdateSystem
  );
  world.run(pipeline, viewport, stats);

  console.log("READY.");
}

main().catch(console.error);
