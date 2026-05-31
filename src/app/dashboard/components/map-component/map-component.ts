import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import View from 'ol/View';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import TileLayer from 'ol/layer/Tile';
import Map from 'ol/Map';
import XYZ from 'ol/source/XYZ';
import { mapConfig } from './mapConfig';
import TileWMS from 'ol/source/TileWMS';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Style from 'ol/style/Style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { MapService } from '../../map-service';
import { CentrarMapaComponent } from "../centrar-mapa/centrar-mapa";
import { puntosTuristicos } from '../../../data/puntosTuristicos';
import Icon from 'ol/style/Icon';
import Overlay from 'ol/Overlay';
import type { FeatureLike } from 'ol/Feature';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { getCenter } from 'ol/extent';
import Point from 'ol/geom/Point';
import { toLonLat } from 'ol/proj';
import { LayerController } from "../layer-controller/layer-controller";

@Component({
  selector: 'app-map-component',
  imports: [CentrarMapaComponent, LayerController],
  templateUrl: './map-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full min-h-0' },
})
export class MapComponent implements AfterViewInit {
  mapRef = viewChild<ElementRef<HTMLElement>>('map');
  map?: Map;
  mapService = inject(MapService);

  popupRef = viewChild<ElementRef<HTMLElement>>('popup');
  popupOverlay?: Overlay;

  ngAfterViewInit(): void {
    const element = this.mapRef()?.nativeElement;
    if (!element) return;

    const darkBasemap = new TileLayer({
      source: new XYZ({
        url: mapConfig.basemap.url,
        attributions: mapConfig.basemap.attribution,
      }),
    });
    darkBasemap.set('name', 'layer_osm');

    this.map = new Map({
      layers: [darkBasemap],
      view: new View({
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        maxZoom: mapConfig.maxZoom,
        minZoom: mapConfig.minZoom,
      }),
      target: element,
      controls: defaultControls({
        attribution: mapConfig.controlsMapOL.attribution,
        zoom: mapConfig.controlsMapOL.zoom,
        rotate: mapConfig.controlsMapOL.rotate,
      }),
    });
    this.mapService.mapRef.set(this.map);

    this.map.on('pointermove', (event: MapBrowserEvent) => {
      if (event.dragging) return;
      const [lon, lat] = toLonLat(event.coordinate);
      this.mapService.coordenadasCursor.set({ lon, lat });
    });
    this.map.getViewport().addEventListener('pointerleave', () => {
      this.mapService.coordenadasCursor.set(null);
    });

    // capa IDE
    const capaIde = new TileLayer({
      source: new TileWMS({
        url: 'https://mapas.ide.uy/geoserver-raster/ortofotos/wms',
        params: {
          LAYERS: 'ortofotos:ORTOFOTOS_2019',
          TILED: true,
          VERSION: '1.1.1',
        },
        serverType: 'geoserver',
        transition: 0,
      }),
      opacity: 1,
    });
    capaIde.set('name', 'layer_ide');
    capaIde.setVisible(false);
    this.map.addLayer(capaIde);

  // capa area urbana
  const areasUrbanas = new TileLayer({
    source: new TileWMS({
      url: ' https://mapas.ide.uy/geoserver-vectorial/ideuy/areas_urbanizadas_3/wms',
      params: {
        LAYERS: 'ideuy:areas_urbanizadas_3',
        TILED: true,
        VERSION: '1.1.1',
      },
      serverType: 'geoserver',
      transition: 0,
    }),
    opacity: 1,
  });
  areasUrbanas.set('name', 'areasUrbanas');
  areasUrbanas.setVisible(true);
  this.map.addLayer(areasUrbanas);

  // capa area urbana
  const capaAeropuerto = new TileLayer({
    source: new TileWMS({
      url: 'https://geoservicios.mtop.gub.uy/geoserver/inf_tte_ttelog_aereo/aeropuertos/wms',
      params: {
        LAYERS: 'inf_tte_ttelog_aereo:aeropuertos',
        TILED: true,
        VERSION: '1.1.1',
      },
      serverType: 'geoserver',
      transition: 0,
    }),
    opacity: 1,
  });
  capaAeropuerto.set('name', 'capaAeropuerto');
  
  capaAeropuerto.setVisible(true);
  this.map.addLayer(capaAeropuerto);
    


/// capa departamentos
const wfsBase = 'https://mapas.ide.uy/geoserver-vectorial/ideuy/wfs';
const departamentosSource = new VectorSource({
  format: new GeoJSON(),
  strategy: bboxStrategy,
  url: (extent) => {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.1.0',
      request: 'GetFeature',
      typeName: 'ideuy:lim_dep_20260414',
      outputFormat: 'application/json',
      srsName: 'EPSG:3857',
      bbox: `${extent.join(',')},EPSG:3857`,
    });
    return `${wfsBase}?${params.toString()}`;
  },
});
const capaDepartamentos = new VectorLayer({
  source: departamentosSource,
  style: new Style({
    fill: new Fill({ color: 'rgba(243, 204, 204, 0.11)' }),
    stroke: new Stroke({ color: 'rgba(202, 157, 157, 0.8)', width: 1 }),
  }),
});
capaDepartamentos.set('name', 'layer_departamentos');
this.map.addLayer(capaDepartamentos);


    // puntos turisticos
    const puntosTuristicosSource = new VectorSource({
      features: new GeoJSON().readFeatures(puntosTuristicos, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
        
      }),

    });
    
    const puntosTuristicosLayer = new VectorLayer({
      source: puntosTuristicosSource,
      style: new Style({
        image: new Icon({
          src: 'map-marker.svg',
          width: 50,
          height: 50,
        }),
      }),
    });

    this.map.addLayer(puntosTuristicosLayer);

    const searchSource = new VectorSource();
    this.mapService.searchSource.set(searchSource);

    const searchLayer = new VectorLayer({
      source: searchSource,
      style: new Style({
        image: new Icon({
          src: 'map-marker-area.svg',
          width: 60,
          height: 60,
          anchor: [0.5, 1],
        }),
      }),
      zIndex: 20,
    });
    searchLayer.set('name', 'layer_search');
    this.map.addLayer(searchLayer);

    const drawSource = new VectorSource();
    this.mapService.registerDrawSource(drawSource);

    const drawLayer = new VectorLayer({
      source: drawSource,
      style: new Style({
        fill: new Fill({ color: 'rgba(59, 130, 246, 0.25)' }),
        stroke: new Stroke({ color: '#3b82f6', width: 2 }),
      }),
      zIndex: 25,
    });
    drawLayer.set('name', 'layer_draw');
    this.map.addLayer(drawLayer);

    this.map.updateSize();

    // overlay popup
    const popupEl = this.popupRef()?.nativeElement;
    if (!popupEl) return;

    this.popupOverlay = new Overlay({
      element: popupEl,
      positioning: 'bottom-center',
      offset: [5, -12],
      stopEvent: false,
    });
    this.map.addOverlay(this.popupOverlay);

    this.map.on('click', (event: MapBrowserEvent) => {
      const feature = this.map?.forEachFeatureAtPixel(
        event.pixel,
        (f: FeatureLike) => f,
        {
          hitTolerance: 8,
          layerFilter: (layer) => layer === puntosTuristicosLayer,
        },
      );

      if (!feature) {
        this.popupOverlay?.setPosition(undefined);
        popupEl.classList.add('hidden');
        return;
      }

      const props = feature.getProperties();
      const geometry = feature.getGeometry();
      if (!geometry) return;

      popupEl.innerHTML = `
        <strong>${props['name'] ?? 'Sin nombre'}</strong><br>
        ${props['street'] ?? ''} ${props['housenumber'] ?? ''}<br>
        ${props['city'] ?? ''}
      `;

      const coordinate =
      geometry instanceof Point
        ? geometry.getCoordinates()
        : getCenter(geometry.getExtent());
    this.popupOverlay?.setPosition(coordinate);
    popupEl.classList.remove('hidden');
    });


  }

  
}
