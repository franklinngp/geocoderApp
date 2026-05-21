export const mapConfig = {
  center: [-6230000, -3850000],
  minZoom: 7,
  maxZoom: 18,
  zoom: 7.5,
  basemap: {
    url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
  },
  controlsMapOL: {
    attribution: false,
    zoom: true,
    rotate: false,
  },
};