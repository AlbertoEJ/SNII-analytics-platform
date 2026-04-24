import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { STATE_CODE_TO_DB_NAME, STATE_DISPLAY_NAME } from "./stateNameMap";
import { MAP_HEIGHT, MAP_WIDTH, type BuiltMap, type StateShape } from "./types";

interface StateProps {
  state_code: number;
  state_name: string;
}

let cache: BuiltMap | null = null;

export async function buildMexicoMap(): Promise<BuiltMap> {
  if (cache) return cache;

  const file = await readFile(join(process.cwd(), "public", "mexico-states.json"), "utf8");
  const fc = JSON.parse(file) as FeatureCollection<Geometry, StateProps>;

  const projection = geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], fc);
  const path = geoPath(projection);

  const shapes: StateShape[] = fc.features.map((f: Feature<Geometry, StateProps>) => {
    const code = f.properties.state_code;
    return {
      code,
      dbName: STATE_CODE_TO_DB_NAME[code] ?? f.properties.state_name.toUpperCase(),
      displayName: STATE_DISPLAY_NAME[code] ?? f.properties.state_name,
      path: path(f) ?? "",
      centroid: path.centroid(f) as [number, number],
    };
  });

  cache = { width: MAP_WIDTH, height: MAP_HEIGHT, shapes };
  return cache;
}
