const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const { Resend } = require("resend");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);
// 🔑 Allow frontend requests
app.use(cors({
  origin: "*"   // or [ "http://localhost:5500", "https://your-gitlab-pages-url" ]
}));

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("🔥 Butterfly Crackers API Running...");
});



function capitalizeWords(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// function generateInvoice(cart, customer, orderId) {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument({ margin: 60, size: "A4" });
//     const filename = `invoice_${orderId}.pdf`;
//     const filepath = path.join(__dirname, "invoices", filename);

//     if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

//     const stream = fs.createWriteStream(filepath);
//     doc.pipe(stream);

//     // ===== HEADER =====
//     doc.fontSize(22).font("Helvetica-Bold").fillColor("#2c3e50")
//       .text("Butterfly Crackers", { align: "center" });
//     doc.moveDown(0.3);
//     doc.fontSize(10).fillColor("gray")
//       .text("Quality Crackers - Celebrate Safely!", { align: "center" });
//     doc.moveDown(0.5);

//     doc.moveTo(60, doc.y).lineTo(550, doc.y).strokeColor("#aaaaaa").stroke();
//     doc.moveDown(1);

//     // ===== INVOICE INFO =====
//     const now = new Date();
//     const invoiceDate = now.toLocaleDateString("en-IN");
//     const invoiceTime = now.toLocaleTimeString("en-IN");

//     const leftX = 60;
//     const rightX = 330;
//     let y = doc.y;

//     doc.font("Helvetica-Bold").fontSize(11).fillColor("#000")
//       .text("Invoice Details", leftX, y);
//     doc.font("Helvetica").fontSize(10);
//     doc.text(`Invoice No : ${orderId}`, leftX, y + 15);
//     doc.text(`Date       : ${invoiceDate}`, leftX, y + 30);
//     doc.text(`Time       : ${invoiceTime}`, leftX, y + 45);

//     doc.font("Helvetica-Bold").fontSize(11).text("Customer Details", rightX, y);
//     doc.font("Helvetica").fontSize(10);
//     doc.text(`Name     : ${capitalizeWords(customer.name)}`, rightX, y + 15);
//     doc.text(`Email    : ${customer.email}`, rightX, y + 30);
//     doc.text(`Phone    : ${customer.phone}`, rightX, y + 45);
//     doc.text(`WhatsApp : ${customer.whatsapp}`, rightX, y + 60);
//     doc.text(`Pincode  : ${customer.pincode}`, rightX, y + 75);
//     doc.text(`District : ${capitalizeWords(customer.district)}`, rightX, y + 90);

//     doc.moveDown(4);

//     // ===== PRODUCT TABLE =====
//     const startX = 60;
//     const tableWidth = 480;
//     const colWidths = [50, 200, 80, 75, 75];
//     y = doc.y;

//     doc.rect(startX, y, tableWidth, 20).fill("#f5f5f5").stroke();
//     doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);

//     doc.text("S.No", startX, y + 5, { width: colWidths[0], align: "center" });
//     doc.text("Product", startX + colWidths[0], y + 5, { width: colWidths[1], align: "left" });
//     doc.text("Qty", startX + colWidths[0] + colWidths[1], y + 5, { width: colWidths[2], align: "center" });
//     doc.text("MRP", startX + colWidths[0] + colWidths[1] + colWidths[2], y + 5, { width: colWidths[3], align: "center" });
//     doc.text("Net Price", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 5, { width: colWidths[4], align: "center" });

//     y += 20;
//     doc.font("Helvetica").fontSize(10).fillColor("#000");

//     let mrpTotal = 0, netTotal = 0;

//     cart.forEach((item, i) => {
//       const itemMrp = item.oldPrice * item.qty;
//       const itemNet = item.price * item.qty;
//       mrpTotal += itemMrp;
//       netTotal += itemNet;

//       doc.rect(startX, y, tableWidth, 20).strokeColor("#e0e0e0").stroke();

//       doc.text(i + 1, startX, y + 5, { width: colWidths[0], align: "center" });
//       doc.text(item.name, startX + colWidths[0], y + 5, { width: colWidths[1], align: "left" });
//       doc.text(item.qty.toString(), startX + colWidths[0] + colWidths[1], y + 5, { width: colWidths[2], align: "center" });
//       doc.text(`Rs. ${itemMrp}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y + 5, { width: colWidths[3], align: "center" });
//       doc.text(`Rs. ${itemNet}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 5, { width: colWidths[4], align: "center" });

//       y += 20;
//     });

//     // ===== TOTALS =====
//     const discount = mrpTotal - netTotal;
//     doc.moveDown(2);
//     doc.fontSize(11).font("Helvetica-Bold").fillColor("#000");

//     const totalsX = startX;
//     doc.text(`MRP Total: Rs. ${mrpTotal}`, totalsX, doc.y, { width: tableWidth, align: "right" });
//     doc.text(`Discount: Rs. ${discount}`, totalsX, doc.y, { width: tableWidth, align: "right" });

//     doc.fillColor("#27ae60").fontSize(12);
//     doc.text(`Net Total: Rs. ${netTotal}`, totalsX, doc.y, { width: tableWidth, align: "right" });

//     // ===== FOOTER =====
//     doc.moveDown(3);
//     doc.fontSize(10).fillColor("gray").font("Helvetica-Oblique")
//       .text("Thank you for shopping with Butterfly Crackers!", { align: "center" });

//     doc.end();

//     stream.on("finish", () => resolve(filepath));
//     stream.on("error", reject);
//   });
// }

// module.exports = generateInvoice;
function generateInvoice(cart, customer, orderId) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: "A4" });
    const filename = `invoice_${orderId}.pdf`;
    const filepath = path.join(__dirname, "invoices", filename);

    if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // ===== HEADER =====
    doc.fontSize(22).font("Helvetica-Bold").fillColor("#2c3e50")
      .text("Butterfly Crackers", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("gray")
      .text("Quality Crackers - Celebrate Safely!", { align: "center" });
    doc.moveDown(0.5);

    doc.moveTo(60, doc.y).lineTo(550, doc.y).strokeColor("#aaaaaa").stroke();
    doc.moveDown(1);

    // ===== INVOICE INFO =====
    const now = new Date();
    const invoiceDate = now.toLocaleDateString("en-IN");
    const invoiceTime = now.toLocaleTimeString("en-IN", {
  timeZone: "Asia/Kolkata", // ensures IST even if server in another country
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true              // ✅ 12-hour format
});


    const leftX = 60;
    const rightX = 330;
    let y = doc.y;

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000")
      .text("Invoice Details", leftX, y);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Invoice No : ${orderId}`, leftX, y + 15);
    doc.text(`Date       : ${invoiceDate}`, leftX, y + 30);
    doc.text(`Time       : ${invoiceTime}`, leftX, y + 45);

    doc.font("Helvetica-Bold").fontSize(11).text("Customer Details", rightX, y);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Name     : ${capitalizeWords(customer.name)}`, rightX, y + 15);
    doc.text(`Email    : ${customer.email}`, rightX, y + 30);
    doc.text(`Phone    : ${customer.phone}`, rightX, y + 45);
    doc.text(`WhatsApp : ${customer.whatsapp}`, rightX, y + 60);
    doc.text(`Pincode  : ${customer.pincode}`, rightX, y + 75);
    doc.text(`District : ${capitalizeWords(customer.district)}`, rightX, y + 90);

    doc.moveDown(4);

    // ===== PRODUCT TABLE =====
    const startX = 60;
    const tableWidth = 480;
    const colWidths = [50, 200, 80, 75, 75];

    let mrpTotal = 0,
      netTotal = 0;

    function drawTableHeader(y) {
      doc.rect(startX, y, tableWidth, 20).fill("#f5f5f5").stroke();
      doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);

      doc.text("S.No", startX, y + 5, { width: colWidths[0], align: "center" });
      doc.text("Product", startX + colWidths[0], y + 5, { width: colWidths[1], align: "left" });
      doc.text("Qty", startX + colWidths[0] + colWidths[1], y + 5, { width: colWidths[2], align: "center" });
      doc.text("MRP", startX + colWidths[0] + colWidths[1] + colWidths[2], y + 5, { width: colWidths[3], align: "center" });
      doc.text("Net Price", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 5, { width: colWidths[4], align: "center" });

      return y + 20;
    }

    // First header
    y = drawTableHeader(doc.y);

    // Page height limit
    const pageHeight = doc.page.height - doc.page.margins.bottom;

    cart.forEach((item, i) => {
  const itemMrp = item.oldPrice * item.qty;
  const itemNet = item.price * item.qty;
  mrpTotal += itemMrp;
  netTotal += itemNet;

  // Measure product name height
  const productTextOptions = { width: colWidths[1], align: "left" };
  const productHeight = doc.heightOfString(item.name, productTextOptions);

  // Pick max row height (min 20px, but larger if product name wraps)
  const rowHeight = Math.max(20, productHeight + 10);

  // Page break check
  if (y + rowHeight > pageHeight) {
    doc.addPage();
    y = drawTableHeader(doc.y);
  }

  // Draw row box
  doc.rect(startX, y, tableWidth, rowHeight).strokeColor("#e0e0e0").stroke();
  doc.font("Helvetica").fontSize(10).fillColor("#000");

  // Write row values
  doc.text(i + 1, startX, y + 5, { width: colWidths[0], align: "center" });
  doc.text(item.name, startX + colWidths[0], y + 5, { width: colWidths[1], align: "left" });
  doc.text(item.qty.toString(), startX + colWidths[0] + colWidths[1], y + 5, { width: colWidths[2], align: "center" });
  doc.text(`Rs. ${itemMrp}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y + 5, { width: colWidths[3], align: "center" });
  doc.text(`Rs. ${itemNet}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 5, { width: colWidths[4], align: "center" });

  // Move down by row height
  y += rowHeight;
});


    // ===== TOTALS =====
    const discount = mrpTotal - netTotal;
    doc.moveDown(2);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000");

    const totalsX = startX;
    doc.text(`MRP Total: Rs. ${mrpTotal}`, totalsX, doc.y, { width: tableWidth, align: "right" });
    doc.text(`Discount: Rs. ${discount}`, totalsX, doc.y, { width: tableWidth, align: "right" });

    doc.fillColor("#27ae60").fontSize(12);
    doc.text(`Net Total: Rs. ${netTotal}`, totalsX, doc.y, { width: tableWidth, align: "right" });

    // ===== FOOTER =====
    doc.moveDown(3);
    doc.fontSize(10).fillColor("gray").font("Helvetica-Oblique")
      .text("Thank you for shopping with Butterfly Crackers!", { align: "center" });

    doc.end();

    stream.on("finish", () => resolve(filepath));
    stream.on("error", reject);
  });
}

module.exports = generateInvoice;

// API endpoint
app.post("/api/submit-order", async (req, res) => {
  try {
    const { cart, customer } = req.body;
    const orderId = Date.now();

    const pdfPath = await generateInvoice(cart, customer, orderId);

    await resend.emails.send({
      from: "Butterfly Crackers <orders@butterflycrackers.in>",
      to: customer.email,
      bcc: "butterflycrackers2025@gmail.com",
      subject: `🧨 Invoice - Order #${orderId}`,
      html: `<p>Dear ${customer.name},</p><p>Thanks for your order! Please find invoice attached.</p>`,
      attachments: [
        {
          filename: `invoice_${orderId}.pdf`,
          content: fs.readFileSync(pdfPath).toString("base64"),
          type: "application/pdf",
        },
      ],
    });

    res.json({ success: true, orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
