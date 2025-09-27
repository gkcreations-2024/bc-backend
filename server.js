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



function generateInvoice(cart, customer, orderId) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 20, size: "A4" });
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

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#aaaaaa").stroke();
    doc.moveDown(1);

    // ===== INVOICE INFO & CUSTOMER INFO =====
    const now = new Date();
    const invoiceDate = now.toLocaleDateString("en-IN");
    const invoiceTime = now.toLocaleTimeString("en-IN");

    const leftX = 50;
    const rightX = 330;
    let y = doc.y;

    // Left Block - Invoice Info
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000")
      .text("Invoice Details", leftX, y);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Invoice No : ${orderId}`, leftX, y + 15);
    doc.text(`Date       : ${invoiceDate}`, leftX, y + 30);
    doc.text(`Time       : ${invoiceTime}`, leftX, y + 45);

    // Right Block - Customer Info
    doc.font("Helvetica-Bold").fontSize(11).text("Customer Details", rightX, y);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Name     : ${customer.name}`, rightX, y + 15);
    doc.text(`Email    : ${customer.email}`, rightX, y + 30);
    doc.text(`Phone    : ${customer.phone}`, rightX, y + 45);
    doc.text(`WhatsApp : ${customer.whatsapp}`, rightX, y + 60);
    doc.text(`Pincode  : ${customer.pincode}`, rightX, y + 75);
    doc.text(`District : ${customer.district}`, rightX, y + 90);

    doc.moveDown(4);

    // ===== PRODUCT TABLE =====
    const startX = 50;
    const colWidths = [50, 200, 80, 100, 100]; // S.No | Product | Qty | MRP | Net Price
    y = doc.y;

    // Header row background
    doc.rect(startX, y, 530, 20).fill("#f5f5f5").stroke();
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);

    doc.text("S.No", startX, y + 5, { width: colWidths[0], align: "center" });
    doc.text("Product", startX + colWidths[0], y + 5, { width: colWidths[1], align: "left" });
    doc.text("Qty", startX + colWidths[0] + colWidths[1], y + 5, { width: colWidths[2], align: "center" });
    doc.text("MRP", startX + colWidths[0] + colWidths[1] + colWidths[2], y + 5, { width: colWidths[3], align: "center" });
    doc.text("Net Price", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 5, { width: colWidths[4], align: "center" });

    y += 25;
    doc.font("Helvetica").fontSize(10).fillColor("#000");

    let mrpTotal = 0, netTotal = 0;

    cart.forEach((item, i) => {
      const itemMrp = item.oldPrice * item.qty;
      const itemNet = item.price * item.qty;
      mrpTotal += itemMrp;
      netTotal += itemNet;

      doc.text(i + 1, startX, y, { width: colWidths[0], align: "center" });
      doc.text(item.name, startX + colWidths[0], y, { width: colWidths[1], align: "left" });
      doc.text(item.qty.toString(), startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: "center" });
      doc.text(`₹${itemMrp}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: "right" });
      doc.text(`₹${itemNet}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: "center" });

      y += 20;
      doc.moveTo(startX, y).lineTo(580, y).strokeColor("#e0e0e0").stroke();
    });

    // ===== TOTALS =====
    const discount = mrpTotal - netTotal;
    doc.moveDown(3);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000");

    const totalsX = 330;
    doc.text("MRP Total:", totalsX, doc.y, { continued: true });
    doc.text(`₹${mrpTotal}`, { align: "right" });

    doc.text("Discount:", totalsX, doc.y, { continued: true });
    doc.text(`₹${discount}`, { align: "right" });

    doc.fillColor("#000000ff").fontSize(12);
    doc.text("Net Total:", totalsX, doc.y, { continued: true });
    doc.text(`₹${netTotal}`, { align: "right" });

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
