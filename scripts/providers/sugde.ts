import type { GeocodeResult, GeocoderProvider } from '../types';
import https from 'https';

const SUDIR_HOST = 'direcciones.ide.uy';
const SUDIR_PATH = '/api/v1/geocode/direcUnica';

interface SugdeDirecUnicaResult {
  address?: string;
  departamento?: string;
  geom?: string;
  id?: string;
  idCalle?: number;
  idCalleEsq?: number;
  idDepartamento?: number;
  idLocalidad?: number;
  inmueble?: string;
  km?: number;
  lat?: number;
  letra?: string;
  lng?: number;
  localidad?: string;
  manzana?: number;
  nomVia?: string;
  portalNumber?: number;
  postalCode?: string;
  priority?: number;
  ranking?: number;
  solar?: number;
  source?: string;
  state?: number;
  stateMsg?: string;
  tip_via?: string;
  type?: string;
}

export class SugdeProvider implements GeocoderProvider {
  readonly name = 'sudir';

  geocode(query: string): Promise<GeocodeResult | null> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({ 
        q: query,
        limit: '1'
      });

      const options: https.RequestOptions = {
        hostname: SUDIR_HOST,
        path: `${SUDIR_PATH}?${params.toString()}`,
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
            const candidates = JSON.parse(data) as SugdeDirecUnicaResult[];

            if (!candidates || candidates.length === 0) {
              resolve(null);
              return;
            }

            const bestMatch = candidates[0]!;

            if (bestMatch.lng === undefined || bestMatch.lat === undefined || bestMatch.lng === 0) {
              resolve(null);
              return;
            }

            resolve({
              lon: bestMatch.lng,
              lat: bestMatch.lat,
              displayName: bestMatch.address ?? query,
              confidence: bestMatch.ranking !== undefined ? bestMatch.ranking : 100,
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