import type { FeatureLike } from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';

export interface MeasurementResult {
  type: 'line' | 'polygon';
  lengthM: number;
  areaM2?: number;
}

const DRAW_PALETTE = [
  '#4ade80',
  '#60a5fa',
  '#fb923c',
  '#f472b6',
  '#a78bfa',
  '#facc15',
  '#2dd4bf',
  '#f87171',
  '#34d399',
  '#818cf8',
];

let recentColors: string[] = [];

export function randomDrawColor(): string {
  const available = DRAW_PALETTE.filter((c) => !recentColors.includes(c));
  const pool = available.length > 0 ? available : DRAW_PALETTE;
  const color = pool[Math.floor(Math.random() * pool.length)]!;
  recentColors = [...recentColors.slice(-3), color];
  return color;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatArea(m2: number): string {
  if (m2 < 10000) return `${Math.round(m2)} m²`;
  return `${(m2 / 10000).toFixed(2)} ha`;
}

export function formatMeasurementLabel(m: MeasurementResult): string {
  if (m.type === 'line') return formatDistance(m.lengthM);
  if (m.areaM2 != null) {
    return `${formatDistance(m.lengthM)}\n${formatArea(m.areaM2)}`;
  }
  return formatDistance(m.lengthM);
}

function labelCoordinate(geom: Geometry): number[] | undefined {
  if (geom instanceof LineString) {
    const coords = geom.getCoordinates();
    if (coords.length === 0) return undefined;
    if (coords.length === 1) return coords[0];
    return geom.getCoordinateAt(0.5);
  }
  if (geom instanceof Polygon) {
    return geom.getInteriorPoint().getCoordinates();
  }
  return undefined;
}

export function drawFeatureStyle(feature: FeatureLike): Style[] {
  const color = (feature.get('color') as string) ?? '#3b82f6';
  const label = feature.get('label') as string | undefined;
  const geom = feature.getGeometry();
  if (!geom) return [];

  const styles: Style[] = [
    new Style({
      stroke: new Stroke({ color, width: 3, lineCap: 'round', lineJoin: 'round' }),
      fill: new Fill({ color: hexWithAlpha(color, 0.22) }),
    }),
  ];

  if (label && geom instanceof Geometry) {
    const coordinate = labelCoordinate(geom);
    if (coordinate) {
      styles.push(
        new Style({
          geometry: new Point(coordinate),
          text: new Text({
            text: label,
            font: 'bold 12px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#0a0a0a', width: 3 }),
            textAlign: 'center',
            offsetY: -8,
          }),
        }),
      );
    }
  }

  return styles;
}
