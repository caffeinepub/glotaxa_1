// Type shim for the Paddle JS v2 global loaded via CDN script tag
interface PaddleCheckoutItem {
  priceId: string;
  quantity: number;
}

interface PaddleCheckoutCustomer {
  email?: string;
}

interface PaddleCheckoutOptions {
  items: PaddleCheckoutItem[];
  customer?: PaddleCheckoutCustomer;
}

interface PaddleSetupOptions {
  token: string;
  environment?: "sandbox" | "production";
}

interface PaddleInstance {
  Setup(options: PaddleSetupOptions): void;
  Checkout: {
    open(options: PaddleCheckoutOptions): void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

export {};
