import crypto from 'crypto';

interface NgeniusConfig {
  apiKey: string;
  outletRef: string;
  mode: 'sandbox' | 'live';
}

interface CreateOrderParams {
  orderReference: string;
  amount: number;
  currency: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface NgeniusOrderResponse {
  _id: string;
  _links: {
    self: { href: string };
    payment?: { href: string };
  };
  reference: string;
  amount: {
    currencyCode: string;
    value: number;
  };
  createdTime: string;
  state: string;
  paymentLinks?: {
    payment?: { href: string };
  };
}

interface NgeniusPaymentResponse {
  _id: string;
  state: string;
  amount: {
    currencyCode: string;
    value: number;
  };
  authResponse?: {
    authorizationCode?: string;
    success: boolean;
    resultCode: string;
    resultMessage: string;
  };
  paymentMethod?: {
    pan?: string;
    name?: string;
    expiry?: string;
    cardType?: string;
  };
  savedCard?: {
    maskedPan?: string;
    cardholderName?: string;
    scheme?: string;
  };
}

export class NgeniusService {
  private config: NgeniusConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: NgeniusConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return this.config.mode === 'live'
      ? 'https://api-gateway.ngenius-payments.com'
      : 'https://api-gateway.sandbox.ngenius-payments.com';
  }

  private getIdentityUrl(): string {
    return this.config.mode === 'live'
      ? 'https://identity.ngenius-payments.com'
      : 'https://identity.sandbox.ngenius-payments.com';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // NGenius expects the API key to be used directly as Basic auth
    // The API key from portal is already base64 encoded
    let authHeader: string;
    if (this.config.apiKey.includes(':')) {
      // Raw credentials in format "client_id:client_secret" - encode them
      authHeader = `Basic ${Buffer.from(this.config.apiKey).toString('base64')}`;
    } else {
      // Already base64 encoded - use directly
      authHeader = `Basic ${this.config.apiKey}`;
    }

    // Use NGenius v1 identity endpoint
    const response = await fetch(`${this.getIdentityUrl()}/auth/access-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.ni-identity.v1+json',
        'Accept': 'application/vnd.ni-identity.v1+json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NGenius auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    // Token expires in ~5 minutes, refresh 30 seconds early
    this.tokenExpiry = Date.now() + (data.expires_in ? data.expires_in * 1000 : 270000) - 30000;

    return this.accessToken;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: object
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/vnd.ni-payment.v2+json',
        'Accept': 'application/vnd.ni-payment.v2+json',
        'Authorization': `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NGenius API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async createOrder(params: CreateOrderParams): Promise<NgeniusOrderResponse> {
    const amountInMinorUnits = Math.round(params.amount * 100);

    const orderRequest = {
      action: 'SALE',
      amount: {
        currencyCode: params.currency,
        value: amountInMinorUnits,
      },
      merchantAttributes: {
        redirectUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        skipConfirmationPage: true,
      },
      merchantOrderReference: params.orderReference,
      emailAddress: undefined,
      billingAddress: undefined,
    };

    return this.makeRequest<NgeniusOrderResponse>(
      'POST',
      `/transactions/outlets/${this.config.outletRef}/orders`,
      orderRequest
    );
  }

  async getOrder(orderId: string): Promise<NgeniusOrderResponse> {
    return this.makeRequest<NgeniusOrderResponse>(
      'GET',
      `/transactions/outlets/${this.config.outletRef}/orders/${orderId}`
    );
  }

  async getOrderPayment(orderId: string, paymentId: string): Promise<NgeniusPaymentResponse> {
    return this.makeRequest<NgeniusPaymentResponse>(
      'GET',
      `/transactions/outlets/${this.config.outletRef}/orders/${orderId}/payments/${paymentId}`
    );
  }

  extractPaymentPageUrl(orderResponse: NgeniusOrderResponse): string | null {
    return orderResponse._links?.payment?.href || null;
  }

  parseWebhookPayload(body: any): {
    orderId: string;
    status: string;
    paymentId?: string;
    cardBrand?: string;
    cardLast4?: string;
    cardholderName?: string;
  } {
    const eventName = body.eventName || '';
    const order = body.order || body;
    
    let status = 'Pending';
    if (eventName === 'AUTHORISED' || order.state === 'AUTHORISED') {
      status = 'Authorised';
    } else if (eventName === 'CAPTURED' || order.state === 'CAPTURED') {
      status = 'Captured';
    } else if (eventName === 'FAILED' || order.state === 'FAILED') {
      status = 'Failed';
    } else if (eventName === 'CANCELLED' || order.state === 'CANCELLED') {
      status = 'Cancelled';
    }

    const embeddedPayments = order._embedded?.payment;
    const payment = Array.isArray(embeddedPayments) ? embeddedPayments[0] : embeddedPayments;

    let cardBrand: string | undefined;
    let cardLast4: string | undefined;
    let cardholderName: string | undefined;

    if (payment?.paymentMethod) {
      cardBrand = payment.paymentMethod.cardType || payment.paymentMethod.name;
      if (payment.paymentMethod.pan) {
        cardLast4 = payment.paymentMethod.pan.slice(-4);
      }
    }
    if (payment?.savedCard) {
      cardBrand = cardBrand || payment.savedCard.scheme;
      if (payment.savedCard.maskedPan) {
        cardLast4 = cardLast4 || payment.savedCard.maskedPan.slice(-4);
      }
      cardholderName = payment.savedCard.cardholderName;
    }

    return {
      orderId: order._id || order.id,
      status,
      paymentId: payment?._id,
      cardBrand,
      cardLast4,
      cardholderName,
    };
  }

  static isConfigured(): boolean {
    return false;
  }

  static async getConfigFromDb(db: any): Promise<NgeniusConfig | null> {
    return null;
  }

  static getInstance(config: NgeniusConfig): NgeniusService {
    return new NgeniusService(config);
  }
}

export function generateOrderReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NG${timestamp}${random}`;
}
