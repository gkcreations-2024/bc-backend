const express = require("express");
const bodyParser = require("body-parser");
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
function generateInvoice(cart, customer, orderId) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const filename = `invoice_${orderId}.pdf`;
    const filepath = path.join(__dirname, "invoices", filename);

    if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text("Butterfly Crackers - Invoice", { align: "center" });
    doc.moveDown();

    // Customer Info
    doc.fontSize(12).text(`Order ID: ${orderId}`);
    doc.text(`Name: ${customer.name}`);
    doc.text(`Email: ${customer.email}`);
    doc.text(`Phone: ${customer.phone}`);
    doc.moveDown();

    // Products
    let mrpTotal = 0, netTotal = 0;
    cart.forEach((item, i) => {
      const itemMrp = item.oldPrice * item.qty;
      const itemNet = item.price * item.qty;
      mrpTotal += itemMrp;
      netTotal += itemNet;
      doc.text(`${i + 1}. ${item.name} - Qty: ${item.qty} | ₹${itemNet}`);
    });

    doc.moveDown();
    doc.text(`MRP Total: ₹${mrpTotal}`);
    doc.text(`Discount: ₹${mrpTotal - netTotal}`);
    doc.text(`Net Total: ₹${netTotal}`);

    doc.end();

    stream.on("finish", () => resolve(filepath));
    stream.on("error", reject);
  });
}

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
