const invoiceService = require('../services/invoiceService');
const ApiError = require('../utils/ApiError');

async function listInvoices(req, res, next) {
  try {
    const invoices = await invoiceService.getInvoices({});
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
}

async function getInvoice(req, res, next) {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (!invoice) throw new ApiError(404, 'Facture introuvable.');
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
}

// GET /api/invoices/:id/pdf — génération simple d'un PDF de facture
async function getInvoicePdf(req, res, next) {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (!invoice) throw new ApiError(404, 'Facture introuvable.');

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text('Boucherie Mira-Mk', { align: 'center' });
    doc.fontSize(12).text(`Facture N° ${invoice.invoiceNumber}`, { align: 'center' });
    doc.moveDown();
    doc.text(`Client: ${invoice.customerName}`);
    doc.text(`Mode de paiement: ${invoice.paymentMethod}`);
    doc.moveDown();

    invoice.items.forEach((item) => {
      doc.text(
        `${item.productName} - ${item.quantity} ${item.unit} x ${item.unitSalePrice} = ${item.totalSale}`
      );
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total: ${invoice.totalAmount}`, { align: 'right' });

    doc.end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listInvoices, getInvoice, getInvoicePdf };
