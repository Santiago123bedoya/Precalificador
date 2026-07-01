declare module "@palenca/palenca-link" {
  interface PalencaLinkOptions {
    apiKey: string;
    clientId: string;
    userId: string;
    platform?: string;
    sandbox?: boolean;
    sandboxWebhookUrl?: string;
    containerName: string;
    lang?: string;
    hideWhatsApp?: boolean;
    hideLogo?: boolean;
    hideConsent?: boolean;
    retentionAmount?: number;
    redirectUrl?: string;
    whatsAppPhoneNumber?: string;
    customPrivacyUrl?: string;
    initialState?: string;
    styles?: Record<string, string>;
    appearance?: {
      primaryColor?: string;
      borderRadius?: string;
      fontFamily?: string;
    };
  }

  interface PalencaLinkInstance {
    on: (event: string, callback: (data: any) => void) => void;
    destroy: () => void;
  }

  class PalencaLink {
    constructor(options: PalencaLinkOptions);
    on: (event: string, callback: (data: any) => void) => void;
    destroy: () => void;
  }

  export default PalencaLink;
}
