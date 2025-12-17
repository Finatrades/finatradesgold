import crypto from 'crypto';

interface NgeniusConfig {
  apiKey: string;
  outletRef: string;
  realmName?: string;
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

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // NGenius API Key should be used directly with Basic auth
    // Format: Basic <api_key_from_portal>
    const authHeader = `Basic ${this.config.apiKey}`;
    const tokenUrl = `${this.getBaseUrl()}/identity/auth/access-token`;
    
    console.log('[NGenius] Requesting access token from:', tokenUrl);
    console.log('[NGenius] Mode:', this.config.mode);

    // NGenius token endpoint - per docs: Content-Type, Accept, and Authorization
    // Important: NGenius requires an empty body in the POST request
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.ni-identity.v1+json',
        'Content-Type': 'application/vnd.ni-identity.v1+json',
        'Authorization': authHeader,
      },
      body: '',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NGenius] Auth failed:', response.status, errorText);
      throw new Error(`NGenius auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    // Token expires in ~5 minutes, refresh 30 seconds early
    this.tokenExpiry = Date.now() + (data.expires_in ? data.expires_in * 1000 : 270000) - 30000;
    
    console.log('[NGenius] Access token obtained successfully');

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

  // Create a hosted session for embedded card form
  async createHostedSession(params: {
    orderReference: string;
    amount: number;
    currency: string;
  }): Promise<{
    sessionId: string;
    paymentRef: string;
    amount: { currencyCode: string; value: number };
  }> {
    const amountInMinorUnits = Math.round(params.amount * 100);

    // First create an order
    const orderRequest = {
      action: 'SALE',
      amount: {
        currencyCode: params.currency,
        value: amountInMinorUnits,
      },
      merchantOrderReference: params.orderReference,
    };

    const order = await this.makeRequest<NgeniusOrderResponse>(
      'POST',
      `/transactions/outlets/${this.config.outletRef}/orders`,
      orderRequest
    );

    // Extract the payment link which contains session info
    const paymentHref = order._links?.payment?.href;
    if (!paymentHref) {
      throw new Error('No payment link in order response');
    }

    // Parse the session from payment URL or order ID
    const orderId = order._id;
    
    return {
      sessionId: orderId,
      paymentRef: order.reference,
      amount: order.amount,
    };
  }

  // Complete payment for hosted session (after card is entered)
  async completeHostedPayment(orderId: string): Promise<{
    success: boolean;
    status: string;
    transactionId?: string;
  }> {
    try {
      const order = await this.getOrder(orderId);
      
      const status = order.state;
      const success = ['CAPTURED', 'AUTHORISED', 'PURCHASED'].includes(status);

      return {
        success,
        status,
        transactionId: order._id,
      };
    } catch (error) {
      console.error('[NGenius] Error completing payment:', error);
      return {
        success: false,
        status: 'ERROR',
      };
    }
  }

  // Process payment with session ID from frontend SDK
  async processPaymentWithSessionId(params: {
    sessionId: string;
    amount: number;
    currency: string;
    orderReference: string;
  }): Promise<{
    success: boolean;
    status: string;
    orderId?: string;
    transactionId?: string;
    message?: string;
  }> {
    try {
      const amountInMinorUnits = Math.round(params.amount * 100);

      // Step 1: Create an order
      const orderRequest = {
        action: 'SALE',
        amount: {
          currencyCode: params.currency,
          value: amountInMinorUnits,
        },
        merchantOrderReference: params.orderReference,
      };

      console.log('[NGenius] Creating order for session payment:', orderRequest);

      const order = await this.makeRequest<NgeniusOrderResponse>(
        'POST',
        `/transactions/outlets/${this.config.outletRef}/orders`,
        orderRequest
      );

      const orderId = order._id;
      console.log('[NGenius] Order created:', orderId);

      // Step 2: Complete payment with session ID
      // PUT /transactions/outlets/{outletRef}/orders/{orderId}/payments/session/{sessionId}
      const paymentResult = await this.makeRequest<any>(
        'PUT',
        `/transactions/outlets/${this.config.outletRef}/orders/${orderId}/payments/session/${params.sessionId}`,
        {}
      );

      console.log('[NGenius] Payment result:', paymentResult);

      // Check payment status
      const status = paymentResult.state || paymentResult._embedded?.payment?.[0]?.state;
      const success = ['CAPTURED', 'AUTHORISED', 'PURCHASED'].includes(status);

      return {
        success,
        status: status || 'UNKNOWN',
        orderId,
        transactionId: paymentResult._id,
      };
    } catch (error: any) {
      console.error('[NGenius] Error processing session payment:', error);
      return {
        success: false,
        status: 'ERROR',
        message: error.message || 'Payment processing failed',
      };
    }
  }

  // Get outlet ref for frontend SDK (this is safe to expose)
  getOutletRef(): string {
    return this.config.outletRef;
  }

  // Get mode for frontend SDK
  getMode(): 'sandbox' | 'live' {
    return this.config.mode;
  }
}

export function generateOrderReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NG${timestamp}${random}`;
}
