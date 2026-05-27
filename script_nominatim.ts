import * as fs from 'fs';
import * as path from 'path';
import { puntosTuristicos } from './src/app/data/puntosTuristicos';

const USER_AGENT = 'MiAppTurismoMontevideo/1.0';


const OUTPUT_TS_FILE = path.join(__dirname, 'src', 'app', 'data', 'puntosTuristicos.ts');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Feature {
  type: string;
  properties: {
    name: string;
    housenumber?: string | null;
    street?: string | null;
    city?: string | null;
    country?: string | null;
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: number[]; // [lon, lat] originales de control
  };
  id: string;
}

// para calcular la distancia en metros entre dos coordenadas
function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
}

async function geocodeAll() {
  const features = puntosTuristicos.features as Feature[];
  const updatedFeatures: Feature[] = [];


  let puntosEncontrados = 0;
  let sumaDistancias = 0;
  const distancias: number[] = [];

  console.log(`Iniciando geocodificación experimental de ${features.length} puntos usando: "Nombre del punto, Uruguay"...`);

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const props = feature.properties;
    const name = props.name || '';

    // Aca es lo que se le pasa a Nominatim
    const searchQuery = `${name.trim()}, Uruguay`;

    console.log(`[${i + 1}/${features.length}] Buscando: "${searchQuery}"...`);

    const [originalLon, originalLat] = feature.geometry.coordinates;

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as any[];

      if (data && data.length > 0) {
        const prediction = data[0];
        const lonPredicho = parseFloat(prediction.lon);
        const latPredicho = parseFloat(prediction.lat);

        let distanciaErrorMedida = 0;
        if (originalLat && originalLon) {
          distanciaErrorMedida = calcularDistanciaMetros(originalLat, originalLon, latPredicho, lonPredicho);
          sumaDistancias += distanciaErrorMedida;
          distancias.push(distanciaErrorMedida);
          puntosEncontrados++;
        }
        const updatedFeature = {
          ...feature,
          geometry: {
            type: 'Point',
            coordinates: [lonPredicho, latPredicho]
          },
          properties: {
            ...feature.properties,
            nominatim_display_name: prediction.display_name,
            nominatim_class: prediction.class,
            experimento_error_metros: Math.round(distanciaErrorMedida * 100) / 100 
          }
        };

        updatedFeatures.push(updatedFeature);
        console.log(`   ✅ Encontrado. Error de predicción: ${distanciaErrorMedida.toFixed(2)} metros.`);
      } else {
        console.warn(`   ❌ Sin resultados para: "${searchQuery}". Manteniendo coordenadas originales.`);
        
        const updatedFeature = {
          ...feature,
          properties: {
            ...feature.properties,
            experimento_error_metros: -1 // -1 significa que Nominatim no lo encontró
          }
        };
        updatedFeatures.push(updatedFeature);
      }

    } catch (error) {
      console.error(`   💥 Error procesando "${name}":`, error);
      updatedFeatures.push(feature);
    }

    // se hace con espera para no saturar a pedidos
    await delay(1500);
  }

  // Estructuramos el objeto final simulando el GeoJSON original
  const finalGeoJSON = {
    type: "FeatureCollection",
    name: "turismo_nominatim_experimento_uruguay",
    features: updatedFeatures
  };

  // Convertimos el objeto en una cadena de texto de código TypeScript exportable
  const tsContent = `export const puntosTuristicos = ${JSON.stringify(finalGeoJSON, null, 2)};\n`;

  fs.writeFileSync(OUTPUT_TS_FILE, tsContent, 'utf-8');
  console.log(`\n  Todo bien! Archivo actualizado en: ${OUTPUT_TS_FILE}`);
  
  // --- IMPRESIÓN DEL REPORTE FINAL ---
  console.log(`\n==================================================`);
  console.log(`📊 REPORTE: EVALUACIÓN DE NOMBRE + URUGUAY`);
  console.log(`==================================================`);
  console.log(`• Total de puntos en dataset: ${features.length}`);
  console.log(`• Puntos geocodificados con éxito: ${puntosEncontrados}`);
  
  if (puntosEncontrados > 0) {
    const promedioError = sumaDistancias / puntosEncontrados;
    distancias.sort((a, b) => a - b);
    const medianaError = distancias[Math.floor(distancias.length / 2)];

    console.log(`• Tasa de efectividad de búsqueda: ${((puntosEncontrados / features.length) * 100).toFixed(1)}%`);
    console.log(`• Error promedio general: ${promedioError.toFixed(2)} metros`);
    console.log(`• Error medio (Caso típico): ${medianaError.toFixed(2)} metros`);
    console.log(`• Desviación mínima (Mejor caso): ${distancias[0].toFixed(2)} metros`);
    console.log(`• Desviación máxima (Peor caso): ${distancias[distancias.length - 1].toFixed(2)} metros`);
  } else {
    console.log(`• La API no retornó resultados para ningún punto.`);
  }
  console.log(`==================================================\n`);
}

geocodeAll();