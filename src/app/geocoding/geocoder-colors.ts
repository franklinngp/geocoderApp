import type { FeatureLike } from 'ol/Feature';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Text from 'ol/style/Text';
import type { GeocoderId } from './geocoder.types';

export const GEOCODER_COLORS: Record<GeocoderId, string> = {
  nominatim: '#4ade80',
  photon: '#60a5fa',
  arcgis: '#fb923c',
  sudir: '#a855f7',
};

const GEOCODER_ABBR: Record<GeocoderId, string> = {
  nominatim: 'NOM',
  photon: 'PHO',
  arcgis: 'ARC',
  sudir: 'SUG',
};

export function geocoderColor(id: GeocoderId | string | null): string {
  if (id && id in GEOCODER_COLORS) return GEOCODER_COLORS[id as GeocoderId];
  return '#a3a3a3';
}

export function geocoderSearchMarkerStyle(feature: FeatureLike): Style[] {
  const id = (feature.get('geocoderId') as GeocoderId) ?? 'nominatim';
  const color = geocoderColor(id);

  return [
    new Style({
      image: new CircleStyle({
        radius: 10,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
    }),
    new Style({
      text: new Text({
        text: GEOCODER_ABBR[id],
        font: 'bold 10px sans-serif',
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#0a0a0a', width: 3 }),
        offsetY: -18,
      }),
    }),
  ];
}
