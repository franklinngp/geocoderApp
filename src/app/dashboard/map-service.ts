import { Injectable, signal } from '@angular/core';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import type { GeocodeHit, GeocoderId } from '../geocoding/geocoder.types';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  mapRef = signal<Map | null>(null);
  searchSource = signal<VectorSource | null>(null);
  lastSearchHit = signal<GeocodeHit | null>(null);
  lastSearchGeocoder = signal<GeocoderId | null>(null);
  searchError = signal<string | null>(null);
  coordenadasCursor = signal<{ lon: number; lat: number } | null>(null);

  setSearchMarker(lon: number, lat: number): void {
    const source = this.searchSource();
    if (!source) return;

    source.clear();
    source.addFeature(
      new Feature({
        geometry: new Point(fromLonLat([lon, lat]),),
      }),
    );
  }

  clearSearchMarker(): void {
    this.searchSource()?.clear();
  }
}
