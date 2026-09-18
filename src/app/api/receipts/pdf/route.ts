import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";

type ReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

const pdfText = (value: string) =>
  value
    .replace(/[\\()]/g, "\\$&")
    .replace(/[^\x20-\x7E]/g, " ");

function wrap(value: string, width = 64) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildReceiptPdf({
  invoiceNumber,
  storeName,
  customerName,
  amount,
  items,
}: {
  invoiceNumber: string;
  storeName: string;
  customerName: string;
  amount: number;
  items: ReceiptLine[];
}) {
  const lines = [
    storeName.toUpperCase(),
    "OFFICIAL TAX INVOICE - PAID",
    "",
    `Invoice No: ${invoiceNumber}`,
    `Date: ${new Date().toLocaleString("en-IN")}`,
    `Customer: ${customerName}`,
    "Payment: UPI QR - PAID",
    "",
    "ITEMS",
    "------------------------------------------------------------",
    ...items.flatMap((item) => [
      ...wrap(item.name),
      `  ${item.quantity} x Rs. ${Number(item.unitPrice).toFixed(2)}                 Rs. ${Number(item.total).toFixed(2)}`,
    ]),
    "------------------------------------------------------------",
    `TOTAL PAID: Rs. ${amount.toFixed(2)}`,
    "",
    "Thank you for shopping with us.",
  ];

  const content = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    ...lines.flatMap((line, index) => [
      index === 0 ? "/F1 15 Tf" : index === 1 ? "/F1 10 Tf" : "/F1 10 Tf",
      `(${pdfText(line)}) Tj`,
      "0 -15 Td",
    ]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

export async function POST(request: Request) {
  try {
    await requireShopSession();
    const { invoiceNumber, storeName, customerName, amount, items } = await request.json();

    if (!invoiceNumber || !Number.isFinite(Number(amount)) || !Array.isArray(items)) {
      return NextResponse.json({ error: "Valid paid-invoice details are required." }, { status: 400 });
    }

    const pdf = buildReceiptPdf({
      invoiceNumber: String(invoiceNumber),
      storeName: String(storeName || "ShopMate Store"),
      customerName: String(customerName || "Valued Customer"),
      amount: Number(amount),
      items,
    });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${String(invoiceNumber).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not generate the receipt PDF." }, { status: 500 });
  }
}
