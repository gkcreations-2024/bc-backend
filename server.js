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

// Generate invoice function
// const fs = require("fs");
// const path = require("path");
// const PDFDocument = require("pdfkit");

function generateInvoice(cart, customer, orderId) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `invoice_${orderId}.pdf`;
    const filepath = path.join(__dirname, "invoices", filename);

    if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).font("Helvetica-Bold")
      .text("Butterfly Crackers - Invoice", { align: "center" });
    doc.moveDown(1);

    // Customer Info
    doc.fontSize(12).font("Helvetica");
    doc.text(`Order ID: ${orderId}`);
    doc.text(`Name: ${customer.name}`);
    doc.text(`Email: ${customer.email}`);
    doc.text(`Phone: ${customer.phone}`);
    doc.moveDown(2);

    // Table Header
    const startX = 50;
    let y = doc.y;
    const colWidths = [50, 200, 80, 100, 100]; // S.No | Product | Qty | MRP | Net Price

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
      doc.text(`\u20B9${itemMrp}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: "right" });
      doc.text(`\u20B9${itemNet}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: "right" });

      y += 20;
      doc.moveTo(startX, y).lineTo(550, y).stroke();
    });

    // Totals
    const discount = mrpTotal - netTotal;
    doc.moveDown(2);
    doc.font("Helvetica-Bold");
    doc.text(`MRP Total: \u20B9${mrpTotal}`, { align: "right" });
    doc.text(`Discount: \u20B9${discount}`, { align: "right" });
    doc.text(`Net Total: \u20B9${netTotal}`, { align: "right" });

    // Footer Thank You
    doc.moveDown(3);
    doc.fontSize(14).font("Helvetica-Bold")
      .text("🙏 Thank you for shopping with Butterfly Crackers! 🙏", { align: "center" });

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
