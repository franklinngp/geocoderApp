import type { GeocodeResult, GeocoderProvider } from '../types';
import https from 'https';

const sudir_HOST = 'direcciones.ide.uy';

const sudir_PATH = '/api/v0/geocode/BusquedaDireccion';

interface SudirBusquedaDireccionResult {
  codigoPostal?: number;
  codigoPostalAmpliado?: number;
  direccion?: {
    calle?: { idCalle: number; nombre_normalizado: string };
    departamento?: { idDepartamento: number; nombre_normalizado: string };
    inmueble?: { idPuntoNotable: number; nombre: string };
    localidad?: { idLocalidad: number; nombre_normalizado: string };
    manzana?: number;
    numero?: { nro_puerta: number };
    solar?: number;
  };
  error?: string; 
  idPunto?: number;
  idTipoClasificacion?: number;
  puntoX?: number; 
  puntoY?: number; 
  srid?: number;
}

export class sudirProvider implements GeocoderProvider {
  readonly name = 'sudir';

  geocode(query: string): Promise<GeocodeResult | null> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({ 
        calle: query
 
      });

      const options: https.RequestOptions = {
        hostname: sudir_HOST,
        path: `${sudir_PATH}?${params.toString()}`,
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
            const candidates = JSON.parse(data) as SudirBusquedaDireccionResult[];

            if (!candidates || candidates.length === 0) {
              resolve(null);
              return;
            }

            const bestMatch = candidates[0]!;

            if (
              bestMatch.puntoX === undefined || 
              bestMatch.puntoY === undefined || 
              bestMatch.puntoX === 0 || 
              bestMatch.puntoY === 0
            ) {
              resolve(null);
              return;
            }
            let displayName = query;
            if (bestMatch.direccion?.calle?.nombre_normalizado) {
              const calleNom = bestMatch.direccion.calle.nombre_normalizado;
              const nro = bestMatch.direccion.numero?.nro_puerta ? ` ${bestMatch.direccion.numero.nro_puerta}` : '';
              const loc = bestMatch.direccion.localidad?.nombre_normalizado ? `, ${bestMatch.direccion.localidad.nombre_normalizado}` : '';
              displayName = `${calleNom}${nro}${loc}`;
            }

            let confidence = 100;
            if (bestMatch.error) {
              if (bestMatch.error.includes('APROXIMADO POR CALLE')) confidence = 70;
              else if (bestMatch.error.includes('APROXIMADO POR LOCALIDAD')) confidence = 40;
              else if (bestMatch.error.trim() !== '') confidence = 50; 
            }

            resolve({
              lon: bestMatch.puntoX,
              lat: bestMatch.puntoY,
              displayName: displayName,
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