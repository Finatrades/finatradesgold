import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { geoRestrictions, geoRestrictionSettings } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface GeoCheckResult {
  restricted: boolean;
  countryCode?: string;
  countryName?: string;
  message?: string;
  blockAccess?: boolean;
  allowRegistration?: boolean;
}

const geoCache = new Map<string, { result: { countryCode: string; countryName: string }; expiry: number }>();
const GEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const isProduction = process.env.NODE_ENV === 'production';

async function getCountryFromIP(clientIp: string): Promise<{ countryCode: string; countryName: string } | null> {
  const cached = geoCache.get(clientIp);
  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }

  try {
    const response = await fetch(`https://ipapi.co/${clientIp}/json/`, {
      headers: { 'User-Agent': 'Finatrades/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.country_code && !data.error) {
        const result = { countryCode: data.country_code, countryName: data.country_name || 'Unknown' };
        geoCache.set(clientIp, { result, expiry: Date.now() + GEO_CACHE_TTL });
        return result;
      }
    }
  } catch (error) {
    console.error('[GeoRestriction] Primary HTTPS IP lookup failed:', error);
  }

  try {
    const response = await fetch(`https://freeipapi.com/api/json/${clientIp}`, {
      headers: { 'User-Agent': 'Finatrades/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        const result = { countryCode: data.countryCode, countryName: data.countryName || 'Unknown' };
        geoCache.set(clientIp, { result, expiry: Date.now() + GEO_CACHE_TTL });
        return result;
      }
    }
  } catch (error) {
    console.error('[GeoRestriction] Fallback HTTPS IP lookup also failed:', error);
  }

  return null;
}

function isPrivateIP(ip: string): boolean {
  return ip === '127.0.0.1' || 
         ip === '::1' || 
         ip.startsWith('192.168.') || 
         ip.startsWith('10.') || 
         ip.startsWith('172.16.') ||
         ip.startsWith('172.17.') ||
         ip.startsWith('172.18.') ||
         ip.startsWith('172.19.') ||
         ip.startsWith('172.2') ||
         ip.startsWith('172.30.') ||
         ip.startsWith('172.31.');
}

async function checkGeoRestriction(clientIp: string): Promise<GeoCheckResult> {
  try {
    const [settings] = await db.select().from(geoRestrictionSettings).limit(1);
    
    if (!settings?.isEnabled) {
      return { restricted: false };
    }

    if (!clientIp) {
      console.warn('[GeoRestriction] No client IP provided - blocking');
      return {
        restricted: true,
        countryCode: 'UNKNOWN',
        countryName: 'Unknown',
        message: 'Unable to verify your location.',
        blockAccess: true,
      };
    }

    if (isPrivateIP(clientIp)) {
      if (!isProduction) {
        return { restricted: false };
      }
      console.warn(`[GeoRestriction] Private IP in production: ${clientIp} - may indicate proxy misconfiguration, allowing but should be fixed`);
      return { restricted: false };
    }

    const geoData = await getCountryFromIP(clientIp);
    
    if (!geoData) {
      console.warn(`[GeoRestriction] IP lookup failed for ${clientIp.substring(0, 10)}... - blocking (fail-closed)`);
      return {
        restricted: true,
        countryCode: 'UNKNOWN',
        countryName: 'Unknown',
        message: 'Unable to verify your location. Please try again later.',
        blockAccess: true,
      };
    }

    const { countryCode, countryName } = geoData;

    const [restriction] = await db.select()
      .from(geoRestrictions)
      .where(and(
        eq(geoRestrictions.countryCode, countryCode),
        eq(geoRestrictions.isRestricted, true)
      ))
      .limit(1);

    if (restriction) {
      return {
        restricted: true,
        countryCode: restriction.countryCode,
        countryName: restriction.countryName || countryName,
        message: restriction.restrictionMessage || settings.defaultMessage || 'Service unavailable in your region',
        blockAccess: true,
        allowRegistration: restriction.allowRegistration ?? false,
      };
    }

    return { restricted: false };
  } catch (error) {
    console.error('[GeoRestriction] Check failed:', error);
    return { restricted: false };
  }
}

export function geoRestrictionMiddleware(options: { allowRegistrationBypass?: boolean } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
                       req.headers['x-real-ip']?.toString() ||
                       req.socket.remoteAddress || '';

      const result = await checkGeoRestriction(clientIp);

      if (result.restricted && result.blockAccess) {
        if (options.allowRegistrationBypass && result.allowRegistration) {
          console.log(`[GeoRestriction] Allowed registration from restricted country ${result.countryName} (${result.countryCode})`);
          next();
          return;
        }

        console.log(`[GeoRestriction] BLOCKED: ${result.countryName} (${result.countryCode}) - IP: ${clientIp.substring(0, 10)}... - Path: ${req.path}`);
        
        return res.status(403).json({
          error: 'geo_restricted',
          message: result.message || 'Service unavailable in your region',
          countryCode: result.countryCode,
          countryName: result.countryName,
        });
      }

      next();
    } catch (error) {
      console.error('[GeoRestriction] Middleware error:', error);
      next();
    }
  };
}

export async function isCountryRestricted(clientIp: string): Promise<GeoCheckResult> {
  return checkGeoRestriction(clientIp);
}
