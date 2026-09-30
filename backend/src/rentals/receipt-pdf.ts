import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';

type ReceiptShop = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
};

type ReceiptRental = {
  rentalNumber: string;
  rentalStartDate: Date;
  expectedReturnDate: Date;
  actualReturnDate: Date | null;
  status: string;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  totalRent: Prisma.Decimal;
  totalDeposit: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  balanceAmount: Prisma.Decimal;
  notes: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
  items: Array<{
    rentalPrice: Prisma.Decimal;
    deposit: Prisma.Decimal;
    inventoryItem: {
      itemCode: string;
      name: string;
      size: string | null;
      color: string | null;
    };
  }>;
  payments: Array<{
    amount: Prisma.Decimal;
    paymentType: string;
    method: string;
    paymentDate: Date;
    transactionRef: string | null;
  }>;
};

function money(v: Prisma.Decimal | number) {
  return `INR ${Number(v).toFixed(2)}`;
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function buildRentalReceiptPdf(
  shop: ReceiptShop | null,
  rental: ReceiptRental,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const shopName = shop?.name ?? 'EaseMyLease Shop';
    doc.fontSize(18).text(shopName, { align: 'left' });
    doc.fontSize(10).fillColor('#444');
    const shopLines = [
      [shop?.address, shop?.city, shop?.state, shop?.pincode]
        .filter(Boolean)
        .join(', '),
      shop?.phone ? `Phone: ${shop.phone}` : null,
      shop?.email ? `Email: ${shop.email}` : null,
      shop?.gstNumber ? `GST: ${shop.gstNumber}` : null,
    ].filter(Boolean) as string[];
    for (const line of shopLines) doc.text(line);
    doc.moveDown();

    doc.fillColor('#000').fontSize(14).text('Rental Receipt', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Rental #: ${rental.rentalNumber}`);
    doc.text(`Status: ${rental.status}`);
    doc.text(
      `Period: ${dateStr(rental.rentalStartDate)} to ${dateStr(rental.expectedReturnDate)}`,
    );
    if (rental.actualReturnDate) {
      doc.text(`Returned: ${dateStr(rental.actualReturnDate)}`);
    }
    doc.moveDown();

    doc.fontSize(12).text('Customer');
    doc.fontSize(10);
    doc.text(rental.customer.name);
    doc.text(`Phone: ${rental.customer.phone}`);
    if (rental.customer.email) doc.text(`Email: ${rental.customer.email}`);
    if (rental.customer.address) doc.text(rental.customer.address);
    doc.moveDown();

    doc.fontSize(12).text('Items');
    doc.moveDown(0.3);
    doc.fontSize(9);
    doc.text('Code / Name', 50, doc.y, { continued: true, width: 250 });
    doc.text('Rent', 300, doc.y, { continued: true, width: 80 });
    doc.text('Deposit', 380, doc.y, { width: 80 });
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .stroke('#ccc');
    doc.moveDown(0.5);

    for (const item of rental.items) {
      const label = `${item.inventoryItem.itemCode} · ${item.inventoryItem.name}${
        item.inventoryItem.size ? ` (${item.inventoryItem.size})` : ''
      }`;
      const y = doc.y;
      doc.text(label, 50, y, { width: 240 });
      doc.text(money(item.rentalPrice), 300, y, { width: 80 });
      doc.text(money(item.deposit), 380, y, { width: 80 });
      doc.moveDown(0.4);
    }

    doc.moveDown();
    doc.fontSize(12).text('Totals');
    doc.fontSize(10);
    doc.text(`Subtotal: ${money(rental.subtotal)}`);
    if (Number(rental.discount) > 0) {
      doc.text(`Discount: ${money(rental.discount)}`);
    }
    doc.text(`Total rent: ${money(rental.totalRent)}`);
    doc.text(`Security deposit: ${money(rental.totalDeposit)}`);
    doc.text(`Amount paid: ${money(rental.amountPaid)}`);
    doc.fontSize(11).text(`Balance due: ${money(rental.balanceAmount)}`);
    doc.moveDown();

    if (rental.payments.length > 0) {
      doc.fontSize(12).text('Payments');
      doc.fontSize(9);
      for (const p of rental.payments) {
        doc.text(
          `${dateStr(p.paymentDate)} · ${p.paymentType} · ${p.method} · ${money(p.amount)}${
            p.transactionRef ? ` · Ref ${p.transactionRef}` : ''
          }`,
        );
      }
      doc.moveDown();
    }

    if (rental.notes) {
      doc.fontSize(10).text(`Notes: ${rental.notes}`);
      doc.moveDown();
    }

    doc
      .fontSize(8)
      .fillColor('#666')
      .text(
        `Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC · EaseMyLease`,
        { align: 'center' },
      );

    doc.end();
  });
}
