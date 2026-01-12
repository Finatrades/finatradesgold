/**
 * OpenTelemetry - Banking-Grade Distributed Tracing
 * 
 * OpenTelemetry provides:
 * - Distributed tracing across services
 * - Metrics collection
 * - Automatic instrumentation
 * - Compliance audit trails
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const isProduction = process.env.NODE_ENV === 'production';

export function initializeOpenTelemetry(): void {
  if (!OTEL_ENDPOINT && !isProduction) {
    console.log('[OpenTelemetry] No exporter endpoint configured, tracing disabled');
    return;
  }

  try {
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: 'finatrades',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      'deployment.environment': process.env.NODE_ENV || 'development',
    });

    const traceExporter = OTEL_ENDPOINT ? new OTLPTraceExporter({
      url: `${OTEL_ENDPOINT}/v1/traces`,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS 
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) 
        : {},
    }) : undefined;

    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req) => {
              const url = req.url || '';
              return url.includes('/health') || url.includes('/ready');
            },
          },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
          '@opentelemetry/instrumentation-redis': { enabled: true },
        }),
      ],
    });

    sdk.start();
    console.log('[OpenTelemetry] Tracing initialized');

    process.on('SIGTERM', () => {
      sdk?.shutdown()
        .then(() => console.log('[OpenTelemetry] Shut down successfully'))
        .catch((error) => console.error('[OpenTelemetry] Shutdown error:', error))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    console.error('[OpenTelemetry] Initialization failed:', error);
  }
}

export function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    return sdk.shutdown();
  }
  return Promise.resolve();
}

export { sdk };
