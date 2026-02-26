import type { Invoice16931 } from '../types/invoice';

export function downloadInvoicePDF(invoice: Invoice16931): void {
  const { header, seller, buyer, lineItems, taxDetails, subtotal, grandTotal, currency, paymentTerms } = invoice;

  // Calculate total VAT
  const totalVAT = Object.values(taxDetails).reduce((sum, amount) => sum + amount, 0);

  // Generate line items HTML
  const lineItemsHTML = lineItems
    .map(
      (item, index) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${escapeHTML(item.itemType)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${escapeHTML(item.description)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${currency} ${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${currency} ${item.amount.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.vatRate}%</td>
    </tr>`
    )
    .join('');

  // Generate VAT breakdown HTML
  const vatBreakdownHTML = Object.entries(taxDetails)
    .map(
      ([rate, amount]) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">VAT ${rate}%</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${currency} ${amount.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${escapeHTML(header.invoiceNumber)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 900px;
          margin: 40px auto;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        .invoice-header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #333;
        }
        .invoice-title {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #555;
          border-bottom: 2px solid #ddd;
          padding-bottom: 5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-box {
          padding: 15px;
          background: #f9f9f9;
          border-radius: 5px;
        }
        .info-label {
          font-weight: bold;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .info-value {
          font-size: 14px;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #f0f0f0;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #333;
          font-size: 13px;
        }
        .totals-table {
          width: 50%;
          margin-left: auto;
          margin-top: 20px;
        }
        .totals-table td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        .grand-total {
          font-size: 18px;
          font-weight: bold;
          background: #f0f0f0;
        }
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="invoice-title">${header.invoiceType === 'Invoice' ? 'INVOICE' : 'CREDIT NOTE'}</div>
        <div style="font-size: 14px; color: #666;">
          Invoice No: <strong>${escapeHTML(header.invoiceNumber)}</strong> | 
          Date: <strong>${header.invoiceDate}</strong>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <div class="section-title">Seller Details</div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Name</div>
            <div class="info-value">${escapeHTML(seller.name)}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Address</div>
            <div class="info-value">${escapeHTML(seller.address).replace(/\n/g, '<br>')}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">VAT Number</div>
            <div class="info-value">${escapeHTML(seller.vatNumber)}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Email</div>
            <div class="info-value">${escapeHTML(seller.email)}</div>
          </div>
          <div>
            <div class="info-label">Phone</div>
            <div class="info-value">${escapeHTML(seller.phone)}</div>
          </div>
        </div>

        <div class="info-box">
          <div class="section-title">Buyer Details</div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Name</div>
            <div class="info-value">${escapeHTML(buyer.name)}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Address</div>
            <div class="info-value">${escapeHTML(buyer.address).replace(/\n/g, '<br>')}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Tax ID / Business Reg. Number</div>
            <div class="info-value">${escapeHTML(buyer.taxIdOrBusinessRegNumber)}</div>
          </div>
          <div>
            <div class="info-label">Public Contract Number</div>
            <div class="info-value">${escapeHTML(buyer.publicContractNumber)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Invoice Line Items</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Item Type</th>
              <th>Description</th>
              <th style="text-align: right; width: 80px;">Quantity</th>
              <th style="text-align: right; width: 100px;">Unit Price</th>
              <th style="text-align: right; width: 100px;">Amount</th>
              <th style="text-align: right; width: 80px;">VAT Rate</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Tax Details</div>
        <table class="totals-table">
          <tbody>
            ${vatBreakdownHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Totals</div>
        <table class="totals-table">
          <tbody>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Subtotal (Net Amount before Tax)</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${currency} ${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Total VAT</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${currency} ${totalVAT.toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td style="padding: 12px;">Grand Total (Gross Amount Payable)</td>
              <td style="padding: 12px; text-align: right;">${currency} ${grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Payment Terms</div>
        <div class="info-box">
          <div style="margin-bottom: 10px;">
            <div class="info-label">Payment Due Date</div>
            <div class="info-value">${paymentTerms.paymentDueDate}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Payment Means</div>
            <div class="info-value">${escapeHTML(paymentTerms.paymentMeans)}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Banking Information (IBAN)</div>
            <div class="info-value">${escapeHTML(paymentTerms.bankingInfo.iban)}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div class="info-label">Early Payment Discount</div>
            <div class="info-value">${escapeHTML(paymentTerms.earlyPaymentDiscount)}</div>
          </div>
          <div>
            <div class="info-label">Late Payment Penalty Terms</div>
            <div class="info-value">${escapeHTML(paymentTerms.latePenaltyTerms)}</div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  }
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
