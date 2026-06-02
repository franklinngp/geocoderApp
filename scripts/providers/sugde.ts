import type { GeocodeResult, GeocoderProvider } from '../types';
import https from 'https';

const SUGDE_HOST = 'direcciones.ide.uy';
const SUGDE_PATH = '/api/v0/geocode/BusquedaDireccion';

interface SugdeDireccion {
  codigoPostal?: number;
  codigoPostalAmpliado?: number;
  direccion?: {
    calle?: {
      idCalle?: number;
      nombre_normalizado?: string;
    };
    departamento?: {
      idDepartamento?: number;
      nombre_normalizado?: string;
    };
    inmueble?: {
      idPuntoNotable?: number;
      nombre?: string;
    };
    localidad?: {
      idLocalidad?: number;
      nombre_normalizado?: string;
    };
    manzana?: number;
    numero?: {
      nro_puerta?: number;
    };
    solar?: number;
  };
  error?: string;
  idPunto?: number;
  idTipoClasificacion?: number;
  puntoX?: number;
  puntoY?: number;
  srid?: number;
}

export class SugdeProvider implements GeocoderProvider {
  readonly name = 'sugde';

  geocode(query: string): Promise<GeocodeResult | null> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({ calle: query });
      
      const options: https.RequestOptions = {
        hostname: SUGDE_HOST,
        path: `${SUGDE_PATH}?${params.toString()}`,
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        
        res.on('end', () => {
          try {
            const candidates = JSON.parse(data) as SugdeDireccion[];

            if (!candidates || candidates.length === 0) {
              resolve(null);
              return;
            }

            const bestMatch = candidates[0]!;

            if (bestMatch.puntoX === undefined || bestMatch.puntoY === undefined || bestMatch.puntoX === 0) {
              resolve(null);
              return;
            }

            const calleNom = bestMatch.direccion?.calle?.nombre_normalizado ?? '';
            const nroPuerta = bestMatch.direccion?.numero?.nro_puerta ?? '';
            const locNom = bestMatch.direccion?.localidad?.nombre_normalizado ?? '';
            
            const displayName = `${calleNom} ${nroPuerta}, ${locNom}, Uruguay`.replace(/\s+/g, ' ').trim();

            let confidence = 100;
            const errorText = bestMatch.error?.trim() ?? '';

            if (errorText.includes('APROXIMADO POR CALLE')) {
              confidence = 70;
            } else if (errorText.includes('APROXIMADO POR LOCALIDAD')) {
              confidence = 40;
            } else if (errorText.includes('IMPOSIBLE POSICIONAR')) {
              confidence = 10;
            }

            resolve({
              lon: bestMatch.puntoX,
              lat: bestMatch.puntoY,
              displayName: displayName !== ', , Uruguay' ? displayName : query,
              confidence: confidence,
              raw: bestMatch,
            });
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', () => {
        resolve(null);
      });

      req.end();
    });
  }
}