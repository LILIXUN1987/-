declare module 'tenpay' {
  interface TenpayConfig {
    appid: string;
    mchid: string;
    partnerKey: string;
    pfx?: Buffer;
    notify_url?: string;
    spbill_create_ip?: string;
  }

  interface UnifiedOrderParams {
    out_trade_no: string;
    body: string;
    total_fee: number;
    trade_type: 'NATIVE' | 'JSAPI' | 'APP' | 'MWEB';
    spbill_create_ip?: string;
    notify_url?: string;
    sign_type?: string;
  }

  interface OrderQueryResult {
    trade_state: string;
    transaction_id?: string;
    out_trade_no?: string;
    total_fee?: number;
    [key: string]: any;
  }

  class Tenpay {
    constructor(config: TenpayConfig);

    getNativeUrl(params: UnifiedOrderParams): Promise<string>;

    unifiedOrder(params: UnifiedOrderParams): Promise<any>;

    orderQuery(params: { out_trade_no: string }): Promise<OrderQueryResult | null>;

    micropay(params: any): Promise<any>;

    reverse(params: any): Promise<any>;

    getPayParams(params: any): Promise<any>;

    getPayParamsByPrepay(params: any): Promise<any>;

    getAppParams(params: any): Promise<any>;

    getAppParamsByPrepay(params: any): Promise<any>;

    middleware(handler: (msg: any, req: any, res?: any) => void): any;

    getSignkey(): Promise<any>;

    getPublicKey(): Promise<any>;
  }

  export = Tenpay;
}
