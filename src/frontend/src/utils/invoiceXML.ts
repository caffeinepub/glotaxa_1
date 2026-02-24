import type { Invoice16931 } from '../types/invoice';

export function generateInvoiceXML(invoice: Invoice16931): string {
  const { header, seller, buyer, lineItems, taxDetails, subtotal, grandTotal, currency, paymentTerms } = invoice;

  // Calculate total VAT amount
  const totalVATAmount = Object.values(taxDetails).reduce((sum, amount) => sum + amount, 0);

  // Generate tax subtotals grouped by VAT rate
  const taxSubtotals = Object.entries(taxDetails)
    .map(([rate, amount]) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${(subtotal * parseFloat(rate) / 100).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${amount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${rate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`)
    .join('');

  // Generate invoice lines
  const invoiceLines = lineItems
    .map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${item.amount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXML(item.description)}</cbc:Description>
      <cbc:Name>${escapeXML(item.itemType)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${item.vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ID>${escapeXML(header.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${header.invoiceDate}</cbc:IssueDate>
  <cbc:DueDate>${paymentTerms.paymentDueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${header.invoiceType === 'Invoice' ? '380' : '381'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXML(seller.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(seller.address)}</cbc:StreetName>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXML(seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXML(seller.email)}</cbc:ElectronicMail>
        <cbc:Telephone>${escapeXML(seller.phone)}</cbc:Telephone>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXML(buyer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(buyer.address)}</cbc:StreetName>
      </cac:PostalAddress>
      <cac:PartyIdentification>
        <cbc:ID>${escapeXML(buyer.taxIdOrBusinessRegNumber)}</cbc:ID>
      </cac:PartyIdentification>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cbc:PaymentID>${escapeXML(header.invoiceNumber)}</cbc:PaymentID>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXML(paymentTerms.bankingInfo.iban)}</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:PaymentTerms>
    <cbc:Note>${escapeXML(paymentTerms.paymentMeans)}. Early payment discount: ${escapeXML(paymentTerms.earlyPaymentDiscount)}. Late payment penalty: ${escapeXML(paymentTerms.latePenaltyTerms)}</cbc:Note>
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${totalVATAmount.toFixed(2)}</cbc:TaxAmount>${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${invoiceLines}
</Invoice>`;

  return xml;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadInvoiceXML(invoice: Invoice16931): void {
  const xmlString = generateInvoiceXML(invoice);
  const blob = new Blob([xmlString], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoice.header.invoiceNumber}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
