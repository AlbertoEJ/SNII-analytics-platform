import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { STATE_CODE_TO_DB_NAME, STATE_DISPLAY_NAME } from "./stateNameMap";

export interface StateShape {
  code: number;
  dbName: string;
  displayName: string;
  path: string;
  centroid: [number, number];
}

export interface BuiltMap {
  width: number;
  height: number;
  shapes: StateShape[];
}

interface StateProps {
  state_code: number;
  state_name: string;
}

let cache: BuiltMap | null = null;

export async function buildMexicoMap(width = 800, height = 480): Promise<BuiltMap> {
  if (cache && cache.width === width && cache.height === height) return cache;

  const file = await readFile(join(process.cwd(), "public", "mexico-states.json"), "utf8");
  const fc = JSON.parse(file) as FeatureCollection<Geometry, StateProps>;

  const projection = geoMercator().fitSize([width, height], fc);
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

  cache = { width, height, shapes };
  return cache;
}
