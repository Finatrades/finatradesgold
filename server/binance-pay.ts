import crypto from 'crypto';

const BINANCE_PAY_API_BASE = 'https://bpay.binanceapi.com';

interface BinancePayConfig {
  apiKey: string;
  secretKey: string;
  merchantId?: string;
}

interface CreateOrderParams {
  merchantTradeNo: string;
  orderAmount: number;
  currency: string;
  description: string;
  returnUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
}

interface BinancePayOrderResponse {
  status: string;
  code: string;
  data?: {
    prepayId: string;
    merchantTradeNo: string;
    qrcodeLink: string;
    qrContent: string;
    checkoutUrl: string;
    deeplink: string;
    universalUrl: string;
    expireTime: number;
  };
  errorMessage?: string;
}

interface BinancePayQueryResponse {
  status: string;
  code: string;
  data?: {
    merchantId: string;
    prepayId: string;
    transactionId: string;
    status: 'INITIAL' | 'PROCESSING' | 'PAID' | 'EXPIRED' | 'FAILED';
    currency: string;
    totalFee: number;
    transactTime: number;
    createTime: number;
    payerInfo?: {
      name: string;
      email: string;
    };
  };
  errorMessage?: string;
}

export class BinancePayService {
  private config: BinancePayConfig;

  constructor(config: BinancePayConfig) {
    this.config = config;
  }

  private generateNonce(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateSignature(timestamp: string, nonce: string, body: string): string {
    const payload = `${timestamp}\n${nonce}\n${body}\n`;
    return crypto
      .createHmac('sha512', this.config.secretKey)
      .update(payload)
      .digest('hex')
      .toUpperCase();
  }

  private async makeRequest<T>(endpoint: string, body: object): Promise<T> {
    const timestamp = Date.now().toString();
    const nonce = this.generateNonce();
    const bodyString = JSON.stringify(body);
    const signature = this.generateSignature(timestamp, nonce, bodyString);

    const response = await fetch(`${BINANCE_PAY_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'BinancePay-Timestamp': timestamp,
        'BinancePay-Nonce': nonce,
        'BinancePay-Certificate-SN': this.config.apiKey,
        'BinancePay-Signature': signature,
      },
      body: bodyString,
    });

    const result = await response.json();
    return result as T;
  }

  async createOrder(params: CreateOrderParams): Promise<BinancePayOrderResponse> {
    const body = {
      env: {
        terminalType: 'WEB',
      },
      merchantTradeNo: params.merchantTradeNo,
      orderAmount: params.orderAmount,
      currency: params.currency,
      description: params.description,
      goodsDetails: [{
        goodsType: '01',
        goodsCategory: 'D000',
        referenceGoodsId: 'GOLD',
        goodsName: 'Digital Gold',
        goodsDetail: params.description,
      }],
      ...(params.returnUrl && { returnUrl: params.returnUrl }),
      ...(params.cancelUrl && { cancelUrl: params.cancelUrl }),
      ...(params.webhookUrl && { webhookUrl: params.webhookUrl }),
    };

    return this.makeRequest<BinancePayOrderResponse>('/binancepay/openapi/v3/order', body);
  }

  async queryOrder(merchantTradeNo: string): Promise<BinancePayQueryResponse> {
    return this.makeRequest<BinancePayQueryResponse>('/binancepay/openapi/order/query', {
      merchantTradeNo,
    });
  }

  async queryOrderByPrepayId(prepayId: string): Promise<BinancePayQueryResponse> {
    return this.makeRequest<BinancePayQueryResponse>('/binancepay/openapi/order/query', {
      prepayId,
    });
  }

  verifyWebhookSignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string
  ): boolean {
    const expectedSignature = this.generateSignature(timestamp, nonce, body);
    return expectedSignature === signature;
  }

  static isConfigured(): boolean {
    return !!(
      process.env.BINANCE_PAY_API_KEY &&
      process.env.BINANCE_PAY_SECRET_KEY
    );
  }

  static getInstance(): BinancePayService | null {
    if (!this.isConfigured()) {
      return null;
    }

    return new BinancePayService({
      apiKey: process.env.BINANCE_PAY_API_KEY!,
      secretKey: process.env.BINANCE_PAY_SECRET_KEY!,
      merchantId: process.env.BINANCE_PAY_MERCHANT_ID,
    });
  }
}

export function generateMerchantTradeNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `FT${timestamp}${random}`;
}
