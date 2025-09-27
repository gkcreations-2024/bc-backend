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
    const doc = new PDFDocument({ margin: 50 });
    const filename = `invoice_${orderId}.pdf`;
    const filepath = path.join(__dirname, "invoices", filename);

    if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Company Header
    doc.fontSize(20).font("Helvetica-Bold").text("Butterfly Crackers", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").text("Sivakasi, Tamil Nadu, India", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(16).font("Helvetica-Bold").text("INVOICE", { align: "center" });
    doc.moveDown(1);

    // Invoice Info
    const invoiceDate = new Date().toLocaleDateString("en-IN");
    doc.fontSize(12).font("Helvetica");
    doc.text(`Invoice No: ${orderId}`);
    doc.text(`Date: ${invoiceDate}`);
    doc.moveDown(0.5);

    // Customer Info
    doc.text(`Customer: ${customer.name}`);
    doc.text(`Email: ${customer.email}`);
    doc.text(`Phone: ${customer.phone}`);
    doc.moveDown(1);

    // Table Setup
    const startX = 50;
    let y = doc.y;
    const colWidths = [50, 200, 80, 100, 100]; // S.No | Product | Qty | MRP | Net Price

    // Table Header
    doc.font("Helvetica-Bold");
    doc.text("S.No", startX, y, { width: colWidths[0], align: "center" });
    doc.text("Product", startX + colWidths[0], y, { width: colWidths[1], align: "left" });
    doc.text("Qty", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: "center" });
    doc.text("MRP", startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: "right" });
    doc.text("Net Price", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: "right" });

    y += 20;
    doc.moveTo(startX, y).lineTo(550, y).stroke();

    // Products
    let mrpTotal = 0, netTotal = 0;
    doc.font("Helvetica");

    cart.forEach((item, i) => {
      const itemMrp = item.oldPrice * item.qty;
      const itemNet = item.price * item.qty;
      mrpTotal += itemMrp;
      netTotal += itemNet;

      y += 10;
      doc.text(i + 1, startX, y, { width: colWidths[0], align: "center" });
      doc.text(item.name, startX + colWidths[0], y, { width: colWidths[1], align: "left" });
      doc.text(item.qty.toString(), startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: "center" });
      doc.text(`₹${itemMrp}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: "right" });
      doc.text(`₹${itemNet}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: "right" });

      y += 20;
      doc.moveTo(startX, y).lineTo(550, y).stroke();
    });

    // Totals Section
    const discount = mrpTotal - netTotal;
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold");

    const totalsX = 350;
    doc.text(`MRP Total:`, totalsX, doc.y, { continued: true });
    doc.text(`₹${mrpTotal}`, { align: "right" });

    doc.text(`Discount:`, totalsX, doc.y, { continued: true });
    doc.text(`₹${discount}`, { align: "right" });

    doc.text(`Net Total:`, totalsX, doc.y, { continued: true });
    doc.text(`₹${netTotal}`, { align: "right" });

    // Footer
    doc.moveDown(3);
    doc.fontSize(12).font("Helvetica-Oblique")
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
