declare module 'qrcode' {
  export interface ToDataURLOptions {
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  const QRCode: {
    toDataURL(text: string, options?: ToDataURLOptions): Promise<string>;
  };

  export default QRCode;
}
