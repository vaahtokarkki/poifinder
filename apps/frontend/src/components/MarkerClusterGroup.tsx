import { createPathComponent } from "@react-leaflet/core";
import * as LeafletNamespace from "leaflet";
import LeafletDefault from "leaflet";
import "leaflet.markercluster";
// Positioning and the expand animation. The default blue skin is deliberately
// not imported: the cluster icon is ours, see .poi-cluster
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { ReactNode } from "react";

type MarkerClusterGroupProps = LeafletNamespace.MarkerClusterGroupOptions & {
  children?: ReactNode;
};

type ClusterFactory = (
  options?: LeafletNamespace.MarkerClusterGroupOptions
) => LeafletNamespace.MarkerClusterGroup;

/**
 * markerClusterGroup is not a Leaflet export: the plugin adds it to whatever
 * Leaflet object it gets handed when it loads. Which object that is depends on
 * how the bundler interops the plugin's UMD wrapper with Leaflet's ESM build,
 * so take the factory from whichever of the two has it rather than betting on
 * one and crashing at runtime.
 */
const resolveClusterFactory = (): ClusterFactory => {
  const candidates = [LeafletDefault, LeafletNamespace] as unknown as Array<
    Record<string, unknown> | undefined
  >;
  for (const candidate of candidates) {
    const factory = candidate?.markerClusterGroup;
    if (typeof factory === "function") return factory as ClusterFactory;
  }
  throw new Error(
    "leaflet.markercluster did not attach markerClusterGroup to Leaflet. " +
      "Check that both are resolved to a single copy of leaflet."
  );
};

/**
 * A layer that groups markers sitting on top of each other.
 *
 * OpenStreetMap has the same toilet mapped as a node and as the building
 * around it, four recycling containers at one point, benches a metre apart: at
 * street zoom those land on the same few pixels and only the top one can be
 * tapped.
 *
 * The grouping is deliberately tight, see CLUSTER_RADIUS_PX. This is not the
 * usual "one bubble for the whole city" clustering, which would hide the very
 * thing the map exists to show. It merges points that genuinely cover each
 * other, and clicking the group fans them out.
 *
 * The component is the piece react-leaflet does not ship: it puts the cluster
 * group into the layer context, so <Marker> children attach to it rather than
 * to the map, and keep their React rendered popups.
 */
const MarkerClusterGroup = createPathComponent<
  LeafletNamespace.MarkerClusterGroup,
  MarkerClusterGroupProps
>(function createMarkerClusterGroup({ children: _children, ...options }, context) {
  const clusterGroup = resolveClusterFactory()(options);

  return {
    instance: clusterGroup,
    context: { ...context, layerContainer: clusterGroup },
  };
});

export default MarkerClusterGroup;
