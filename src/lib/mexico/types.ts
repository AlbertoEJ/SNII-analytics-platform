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

export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 480;
