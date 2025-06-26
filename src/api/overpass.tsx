export type OverpassMarkerData = {
  position: [number, number];
  name?: string;
  tags?: Record<string, string>;
  type?: string;
};

const buildOverpassQueryForSingleLocation = (
  center: [number, number] | null,
  radius: number,
  filters: string[],
  bbox: [number, number, number, number]
) => {
  const filterArr = Array.isArray(filters) ? filters : [filters];

  // Build the Overpass QL for all filters
  const filterBlocks = filterArr
    .map(
      (filter) =>
        center
          ? `
        node[${filter}](around:${radius},${center[0]},${center[1]});
        way[${filter}](around:${radius},${center[0]},${center[1]});
        relation[${filter}](around:${radius},${center[0]},${center[1]});
      `
          : `
        node[${filter}](${bbox.join(",")});
        way[${filter}](${bbox.join(",")});
        relation[${filter}](${bbox.join(",")});
      `
    )
    .join("\n");

  return `
    [out:json];
    (
      ${filterBlocks}
    );
    out center;
  `;
};

export async function fetchOverpassMarkers(
  center: [number, number] | null,
  radius: number,
  query: string[],
  bbox: [number, number, number, number]
): Promise<OverpassMarkerData[]> {
  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const body = buildOverpassQueryForSingleLocation(center, radius, query, bbox);

  const res = await fetch(overpassUrl, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await res.json();
  const elements = data.elements || [];
  return elements
    .map((el: any) => {
      if (el.type === "node" && el.lat && el.lon) {
        return {
          position: [el.lat, el.lon] as [number, number],
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
        };
      }
      if (el.type !== "node" && el.center) {
        return {
          position: [el.center.lat, el.center.lon] as [number, number],
          name: el.tags?.name,
          tags: el.tags,
          type: el.type,
        };
      }
      return null;
    })
    .filter(Boolean);
}
