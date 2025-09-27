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
    doc.fontSize(22).text("Butterfly Crackers - Invoice", { align: "center" });
    doc.moveDown(1);

    // Customer Info
    doc.fontSize(12);
    doc.text(`Order ID: ${orderId}`);
    doc.text(`Name: ${customer.name}`);
    doc.text(`Email: ${customer.email}`);
    doc.text(`Phone: ${customer.phone}`);
    doc.moveDown(2);

    // Table Header
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("S.No", 50, doc.y, { continued: true, width: 50 });
    doc.text("Product", 100, doc.y, { continued: true, width: 180 });
    doc.text("Qty", 280, doc.y, { continued: true, width: 60 });
    doc.text("MRP", 340, doc.y, { continued: true, width: 80 });
    doc.text("Net Price", 420, doc.y, { width: 100 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(520, doc.y).stroke();
    doc.font("Helvetica");

    // Products
    let mrpTotal = 0, netTotal = 0;
    cart.forEach((item, i) => {
      const itemMrp = item.oldPrice * item.qty;
      const itemNet = item.price * item.qty;
      mrpTotal += itemMrp;
      netTotal += itemNet;

      doc.text(`${i + 1}`, 50, doc.y, { continued: true, width: 50 });
      doc.text(item.name, 100, doc.y, { continued: true, width: 180 });
      doc.text(item.qty.toString(), 280, doc.y, { continued: true, width: 60 });
      doc.text(`₹${itemMrp}`, 340, doc.y, { continued: true, width: 80 });
      doc.text(`₹${itemNet}`, 420, doc.y, { width: 100 });
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(520, doc.y).stroke();

    // Totals
    const discount = mrpTotal - netTotal;
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold");
    doc.text(`MRP Total: ₹${mrpTotal}`, { align: "right" });
    doc.text(`Discount: ₹${discount}`, { align: "right" });
    doc.text(`Net Total: ₹${netTotal}`, { align: "right" });
    doc.font("Helvetica");

    doc.moveDown(2);

    // Thank You Message
    doc.fontSize(14).text("🙏 Thank you for shopping with Butterfly Crackers! 🙏", { align: "center" });

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
