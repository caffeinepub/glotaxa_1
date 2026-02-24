// EN 16931 compliant invoice data structures

export interface InvoiceHeader {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: 'Invoice' | 'Credit Note';
}

export interface SellerDetails {
  name: string;
  address: string;
  vatNumber: string;
  email: string;
  phone: string;
}

export interface BuyerDetails {
  name: string;
  address: string;
  taxIdOrBusinessRegNumber: string;
  publicContractNumber: string;
}

export interface InvoiceLineItem {
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatRate: number;
}

export interface PaymentTerms {
  paymentDueDate: string;
  paymentMeans: string;
  bankingInfo: {
    iban: string;
  };
  earlyPaymentDiscount: string;
  latePenaltyTerms: string;
}

export interface Invoice16931 {
  header: InvoiceHeader;
  seller: SellerDetails;
  buyer: BuyerDetails;
  lineItems: InvoiceLineItem[];
  taxDetails: { [vatRate: string]: number };
  subtotal: number;
  grandTotal: number;
  currency: string;
  paymentTerms: PaymentTerms;
}
