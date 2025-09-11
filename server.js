const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const RateLimit = require("express-rate-limit");
const { Semaphore } = require("await-semaphore");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const { Parser } = require("json2csv");
const slugify = require("slugify");


// ------------------------
// Configuration
// ------------------------
const app = express();


// CRITICAL FIX: Get PORT and HOST from environment for Fly.io compatibility
const PORT = process.env.PORT || 5000; // Updated to 5000 as per Fly.io's requirement
const HOST = process.env.HOST || "0.0.0.0";


const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const APP_BASE_URL = process.env.APP_BASE_URL;
const APP_FALLBACK_URL = process.env.APP_FALLBACK_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const STAFF_EMAIL = process.env.STAFF_EMAIL;
const STAFF_PASSWORD_HASH = process.env.STAFF_PASSWORD_HASH;


// Email Config
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;


// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Required environment variables check
const requiredEnv = [
  "MONGODB_URI", "JWT_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH",
  "APP_BASE_URL", "APP_FALLBACK_URL", "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "SMTP_HOST", "SMTP_PORT",
  "SMTP_USER", "SMTP_PASS", "STAFF_EMAIL", "STAFF_PASSWORD_HASH"
];


for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}. Aborting.`);
    process.exit(1);
  }
}


// ------------------------
// Rate limiters & PDF semaphore
// ------------------------
const pdfSemaphore = new Semaphore(1);
const publicLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});


const loginLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts from this IP, please try again after 15 minutes.",
});


// ------------------------
// Middleware
// ------------------------
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan("combined"));


// CORRECTED: Added the GitHub Pages domain to the list of allowed origins.
const allowedOrigins = [
  'https://smartcardlink.perfectparcelsstore.com',
  'https://smartcardlink.perfectparcelsstore.com/client-form',
  'https://smartcardlink.perfectparcelsstore.com/admin-dashboard',
  'https://smartcardlink.perfectparcelsstore.com/vcard-clients-dashboard',
  'https://smartcardlink.perfectparcelsstore.com/admin-form',
  APP_BASE_URL,
  APP_FALLBACK_URL,
  'https://endearing-banoffee-27fd44.netlify.app', // NEW: Your Netlify frontend domain
  'https://allan-m5.github.io', // NEW: Your GitHub Pages frontend domain
  'http://localhost:5000' // Temporary for local dev
];


app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(url => origin.startsWith(url))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));


app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, 'public')));


// Health check endpoint for Fly.io
app.get('/', (req, res) => {
  res.send('Hello, world!');
});


// ------------------------
// MongoDB Connection
// ------------------------
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
connectDB();


// ------------------------
// Mongoose Schema & Model
// ------------------------
const logSchema = new mongoose.Schema({
  actorEmail: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  targetClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  notes: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.model("Log", logSchema);


const clientSchema = new mongoose.Schema({
  submissionData: {
    fullName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    phone1: { type: String, required: true, trim: true },
    phone2: { type: String, trim: true },
    phone3: { type: String, trim: true },
    email1: { type: String, required: true, lowercase: true, trim: true, match: [/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"] },
    email2: { type: String, lowercase: true, trim: true, match: [/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"] },
    email3: { type: String, lowercase: true, trim: true, match: [/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"] },
    company: { type: String, required: true, trim: true },
    businessWebsite: { type: String, trim: true },
    portfolioWebsite: { type: String, trim: true },
    locationMap: { type: String, trim: true },
    bio: { type: String, trim: true },
    address: { type: String, trim: true },
    socialLinks: { type: Object, default: {} },
    workingHours: { type: Object, default: {} },
    slug: { type: String, required: true, unique: true }
  },
  adminData: {
    fullName: { type: String, default: "" },
    title: { type: String, default: "" },
    phone1: { type: String, default: "" },
    email1: { type: String, default: "" },
    company: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    // etc. All fields that can be edited by admin
  },
  vcardUrl: { type: String, default: "" },
  qrCodeUrl: { type: String, default: "" },
  status: { type: String, enum: ["Pending", "Processed", "Active", "Disabled", "Deleted"], default: "Pending" },
  history: [{
    action: { type: String, required: true },
    notes: { type: String },
    actorEmail: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});


clientSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});


const Client = mongoose.model("Client", clientSchema);


// ------------------------
// Helpers
// ------------------------
const logAction = async (actorEmail, actorRole, action, targetClientId, notes = null, payload = null) => {
  try {
    await Log.create({ actorEmail, actorRole, action, targetClientId, notes, payload });
  } catch (error) {
    console.error(`❌ Failed to log action '${action}' for client ${targetClientId}:`, error);
  }
};


const generatePdfContent = (doc, client) => {
  const data = client.submissionData;
  doc.fontSize(20).text("Client Submission Form", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Full Name: ${data.fullName || "N/A"}`);
  doc.text(`Title: ${data.title || "N/A"}`);
  doc.text(`Company: ${data.company || "N/A"}`);
  doc.moveDown();
  doc.text(`Phone 1: ${data.phone1 || "N/A"}`);
  if (data.phone2) doc.text(`Phone 2: ${data.phone2}`);
  if (data.phone3) doc.text(`Phone 3: ${data.phone3}`);
  doc.moveDown();
  doc.text(`Email 1: ${data.email1 || "N/A"}`);
  if (data.email2) doc.text(`Email 2: ${data.email2}`);
  if (data.email3) doc.text(`Email 3: ${data.email3}`);
  doc.moveDown();
  doc.text(`Bio: ${data.bio || "N/A"}`);
  doc.text(`Address: ${data.address || "N/A"}`);
  doc.text(`Business Website: ${data.businessWebsite || "N/A"}`);
  doc.text(`Portfolio Website: ${data.portfolioWebsite || "N/A"}`);
  if (data.socialLinks && typeof data.socialLinks === "object") {
    doc.moveDown();
    doc.text("Social Links:");
    for (const [key, value] of Object.entries(data.socialLinks)) {
      if (value) doc.text(`      - ${key}: ${value}`);
    }
  }
  if (data.workingHours && typeof data.workingHours === "object") {
    doc.moveDown();
    doc.text("Working Hours:");
    for (const [key, value] of Object.entries(data.workingHours)) {
      if (value) doc.text(`      - ${key}: ${value}`);
    }
  }
};


const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided." });
  try {
    // Corrected JWT verification, removed redundant expiresIn parameter
    const decoded = jwt.verify(token, JWT_SECRET, { audience: "smartcardlink", issuer: "smartcardlink-app" });
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") return res.status(401).json({ success: false, message: "Invalid token." });
    return res.status(500).json({ success: false, message: "Authentication error." });
  }
};


const adminAuth = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
  }
};


const staffAuth = (req, res, next) => {
  if (req.user && !req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Forbidden: Staff access required." });
  }
};


const pdfDir = path.join(__dirname, "vcards");
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });


const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});


const sendVCardEmail = async (client) => {
  const vcardUrl = client.vcardUrl;
  const mailOptions = {
    from: `SmartCardLink <${SMTP_USER}>`,
    to: client.submissionData.email1,
    cc: ADMIN_EMAIL,
    subject: `Your SmartCardLink vCard is ready!`,
    html: `
        <p>Hello ${client.submissionData.fullName},</p>
        <p>Thank you for using SmartCardLink! Your digital business card is now ready.</p>
        <p>You can access your vCard here: <a href="${vcardUrl}">${vcardUrl}</a></p>
        <p>You can also use the QR code provided by the admin to share your contact details easily.</p>
        <p>Best regards,<br>The SmartCardLink Team</p>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${client.submissionData.email1} and ${ADMIN_EMAIL}`);
    await logAction(ADMIN_EMAIL, "system", "EMAIL_SENT", client._id, null, { recipient: client.submissionData.email1 });
    return { success: true };
  } catch (error) {
    console.error(`❌ Error sending email to ${client.submissionData.email1}:`, error);
    await logAction(ADMIN_EMAIL, "system", "EMAIL_FAILED", client._id, error.message, { recipient: client.submissionData.email1 });
    return { success: false, error: error.message };
  }
};


const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "smartcardlink_photos",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});
const parser = multer({ storage });


// ------------------------
// Routes
// ------------------------


// Client Submission: POST /api/clients
app.post("/api/clients", publicLimiter, async (req, res) => {
  try {
    const { fullName } = req.body;
    let baseSlug = slugify(fullName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;


    // Corrected slug collision logic
    while (await Client.findOne({ 'submissionData.slug': slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }


    const client = new Client({
      submissionData: { ...req.body, slug },
      status: "Pending"
    });
    await client.save();
    await logAction("public", "public", "CLIENT_CREATED", client._id, "New client submitted via public form.");
    res.status(201).json({ success: true, message: "Client form saved", recordId: client._id });
  } catch (err) {
    console.error("❌ Error saving client form:", err);
    if (err.name === "ValidationError") return res.status(400).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Admin Dashboard: GET /api/clients
app.get("/api/clients", authMiddleware, adminAuth, async (req, res) => {
  try {
    const allClients = await Client.find({});
    res.status(200).json(allClients);
  } catch (error) {
    console.error("❌ Error fetching all clients:", error);
    res.status(500).json({ success: false, message: "Server error fetching clients." });
  }
});


// vCard Clients Dashboard: GET /api/clients/staff
// FIX: Removed authMiddleware to make this route public.
app.get("/api/clients/staff", async (req, res) => {
  try {
    const allClients = await Client.find({}, '_id submissionData.fullName submissionData.email1 submissionData.company status createdAt');
    res.status(200).json(allClients);
  } catch (error) {
    console.error("❌ Error fetching clients for staff dashboard:", error);
    res.status(500).json({ success: false, message: "Server error fetching clients." });
  }
});


// Admin Form: GET /api/clients/:id
app.get("/api/clients/:id", authMiddleware, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found." });
    }
    res.status(200).json(client);
  } catch (error) {
    console.error("❌ Error fetching client data:", error);
    res.status(500).json({ success: false, message: "Server error fetching client data." });
  }
});


// Upload Photo (PREVIEW ONLY): POST /api/clients/:id/photo
app.post("/api/clients/:id/photo", authMiddleware, adminAuth, parser.single("photo"), async (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ success: false, message: "Upload failed: no file provided or path found" });
  }
  // The photoUrl is for preview only and not persisted to the database here.
  await logAction(req.user.email, req.user.isAdmin ? "admin" : "staff", "PHOTO_UPLOADED", req.params.id, null, { tempPhotoUrl: req.file.path });
  res.status(200).json({ success: true, message: "Photo uploaded for preview.", photoUrl: req.file.path });
});


// Save/Update Info: PUT /api/clients/:id
app.put("/api/clients/:id", authMiddleware, adminAuth, async (req, res) => {
  try {
    const { photoUrl, ...adminData } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found." });
    }
    // Corrected logic to use Object.assign for partial updates
    Object.assign(client.adminData, adminData);
    client.adminData.photoUrl = photoUrl;
    client.status = "Processed";
    client.history.push({
      action: "CLIENT_UPDATED / SAVE_INFO",
      notes: "Admin confirmed and saved client data.",
      actorEmail: req.user.email
    });
    await client.save();
    await logAction(req.user.email, "admin", "CLIENT_UPDATED / SAVE_INFO", client._id, "Admin saved confirmed data.");
    res.status(200).json({ success: true, message: "Client info saved successfully.", client });
  } catch (error) {
    console.error("❌ Error saving client info:", error);
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Server error saving client info." });
  }
});


// Create vCard: POST /api/clients/:id/vcard
app.post("/api/clients/:id/vcard", authMiddleware, adminAuth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found." });
    if (client.status !== "Processed") return res.status(400).json({ success: false, message: "vCard can only be created for clients with 'Processed' status." });


    const finalVcardUrl = `${APP_BASE_URL}/${client.submissionData.slug}`;
    const fallbackVcardUrl = `${APP_FALLBACK_URL}/vcard/${client._id}`;
    const qrCodeUrl = await QRCode.toDataURL(fallbackVcardUrl);


    client.vcardUrl = finalVcardUrl;
    client.qrCodeUrl = qrCodeUrl;
    client.status = "Active";
    client.history.push({
      action: "VCARD_CREATED",
      notes: "vCard and QR code generated.",
      actorEmail: req.user.email
    });
    await client.save();


    await logAction(req.user.email, "admin", "VCARD_CREATED", client._id, "vCard generated and status set to Active.");
    const emailStatus = await sendVCardEmail(client);


    if (emailStatus.success) {
      res.status(200).json({
        success: true,
        message: "vCard created and email sent successfully.",
        vcardUrl: finalVcardUrl,
        qrCodeUrl: qrCodeUrl
      });
    } else {
      res.status(200).json({
        success: true,
        message: "vCard created successfully. WARNING: Email failed to send.",
        vcardUrl: finalVcardUrl,
        qrCodeUrl: qrCodeUrl,
        emailError: emailStatus.error
      });
    }
  } catch (error) {
    console.error("❌ Error creating vCard:", error);
    res.status(500).json({ success: false, message: "Server error creating vCard." });
  }
});


// View Client PDF: GET /api/clients/:id/pdf
app.get("/api/clients/:id/pdf", authMiddleware, adminAuth, async (req, res) => {
  const release = await pdfSemaphore.acquire();
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found." });


    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=client-${client.submissionData.slug}-submission.pdf`);
    doc.pipe(res);
    // CRITICAL: Use submissionData for immutable snapshot
    generatePdfContent(doc, client);
    doc.end();


    await logAction(req.user.email, "admin", "PDF_VIEWED", client._id);
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    res.status(500).json({ success: false, message: "Server error generating PDF." });
  } finally {
    release();
  }
});


// Status change routes (Disable/Reactivate/Delete)
app.put("/api/clients/:id/status/:newStatus", authMiddleware, adminAuth, async (req, res) => {
  const { newStatus } = req.params;
  const { notes } = req.body;
  const validStatuses = ["Active", "Disabled", "Deleted"];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ success: false, message: "Invalid status provided." });
  }
  if (!notes || notes.length < 5) {
    return res.status(400).json({ success: false, message: "Notes are required and must be at least 5 characters long." });
  }


  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found." });


    client.status = newStatus;
    client.history.push({
      action: `STATUS_CHANGED to ${newStatus}`,
      notes,
      actorEmail: req.user.email
    });
    await client.save();
    await logAction(req.user.email, "admin", "STATUS_CHANGED", client._id, notes, { newStatus });


    res.status(200).json({ success: true, message: `Client status updated to ${newStatus}.`, client });
  } catch (error) {
    console.error("❌ Error updating client status:", error);
    res.status(500).json({ success: false, message: "Server error updating status." });
  }
});


// Excel Export: GET /api/clients/export
app.get("/api/clients/export", authMiddleware, adminAuth, async (req, res) => {
  try {
    const clients = await Client.find({});
    // Added 'updatedAt' to the export fields
    const fields = [
      "_id",
      "submissionData.fullName",
      "submissionData.title",
      "submissionData.company",
      "submissionData.email1",
      "submissionData.phone1",
      "vcardUrl",
      "status",
      "createdAt",
      "updatedAt"
    ];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(clients);
    res.header('Content-Type', 'text/csv');
    res.attachment('smartcardlink_clients_export.csv');
    res.send(csv);
    await logAction(req.user.email, "admin", "DATA_EXPORTED", null, "Client data exported to Excel.");
  } catch (error) {
    console.error("❌ Error exporting client data:", error);
    res.status(500).json({ success: false, message: "Server error exporting data." });
  }
});


// Log Viewer: GET /api/logs
app.get("/api/logs", authMiddleware, adminAuth, async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    res.status(500).json({ success: false, message: "Server error fetching logs." });
  }
});


// Public vCard Access (fallback route): GET /vcard/:id
app.get("/vcard/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client || client.status !== "Active") {
      return res.status(404).send("vCard not found or not active.");
    }
    const data = client.adminData.photoUrl ? client.adminData : client.submissionData;


    // Enhanced HTML template for better styling
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.fullName} - SmartCardLink</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background-color: #f0f2f5; color: #333; }
            .vcard-container { max-width: 600px; margin: 40px auto; padding: 30px; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
            .vcard-photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 25px; border: 4px solid #f0f2f5; }
            h1 { font-size: 2em; margin: 0; color: #1a1a1a; }
            h2 { font-size: 1.2em; color: #555; font-weight: 400; margin-top: 5px; }
            .details { margin-top: 20px; text-align: left; }
            .details p { margin: 10px 0; font-size: 1.1em; color: #444; }
            .details strong { color: #1a1a1a; }
            .icon { vertical-align: middle; margin-right: 10px; }
            .footer-links { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
            .footer-links a { text-decoration: none; color: #007bff; margin: 0 15px; font-weight: 600; }
            .footer-links a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="vcard-container">
            ${client.adminData.photoUrl ? `<img src="${client.adminData.photoUrl}" alt="Profile Photo" class="vcard-photo">` : ''}
            <h1>${data.fullName}</h1>
            <h2>${data.title} at ${data.company}</h2>
            <div class="details">
              <p><img src="https://img.icons8.com/material-outlined/24/000000/phone.png" alt="Phone Icon" class="icon"><strong>Phone:</strong> ${data.phone1}</p>
              <p><img src="https://img.icons8.com/material-outlined/24/000000/email.png" alt="Email Icon" class="icon"><strong>Email:</strong> ${data.email1}</p>
              ${data.bio ? `<p><img src="https://img.icons8.com/material-outlined/24/000000/about.png" alt="Bio Icon" class="icon"><strong>Bio:</strong> ${data.bio}</p>` : ''}
              ${data.businessWebsite ? `<p><img src="https://img.icons8.com/material-outlined/24/000000/website.png" alt="Website Icon" class="icon"><strong>Website:</strong> <a href="${data.businessWebsite}">${data.businessWebsite}</a></p>` : ''}
              ${data.address ? `<p><img src="https://img.icons8.com/material-outlined/24/000000/address.png" alt="Address Icon" class="icon"><strong>Address:</strong> ${data.address}</p>` : ''}
            </div>
            <div class="footer-links">
              <a href="#">Save to Contacts</a>
              <a href="#">Share</a>
            </div>
          </div>
        </body>
        </html>
    `;
    res.status(200).send(htmlContent);
  } catch (error) {
    console.error("❌ Error accessing public vCard:", error);
    res.status(500).send("Error accessing vCard.");
  }
});


// Login routes
app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const { password } = req.body;
  try {
    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isMatch) {
      await logAction(ADMIN_EMAIL, "admin", "LOGIN_FAILED", null, "Invalid credentials provided.", { ip: req.ip });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({ isAdmin: true, email: ADMIN_EMAIL }, JWT_SECRET, {
      expiresIn: "1h", audience: "smartcardlink", issuer: "smartcardlink-app",
    });
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await logAction(ADMIN_EMAIL, "admin", "LOGIN_SUCCESS", null, null, { ip: req.ip, expiry });
    res.json({ success: true, token, message: "Login successful. Token valid for 1 hour." });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


app.post("/api/staff/login", loginLimiter, async (req, res) => {
  const { password } = req.body;
  try {
    const isMatch = await bcrypt.compare(password, STAFF_PASSWORD_HASH);
    if (!isMatch) {
      await logAction(STAFF_EMAIL, "staff", "LOGIN_FAILED", null, "Invalid credentials provided.", { ip: req.ip });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({ isAdmin: false, email: STAFF_EMAIL }, JWT_SECRET, {
      expiresIn: "1h", audience: "smartcardlink", issuer: "smartcardlink-app",
    });
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await logAction(STAFF_EMAIL, "staff", "LOGIN_SUCCESS", null, null, { ip: req.ip, expiry });
    res.json({ success: true, token, message: "Login successful. Token valid for 1 hour." });
  } catch (err) {
    console.error("❌ Staff login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 SmartCardLink App running at http://${HOST}:${PORT}`);
});


module.exports = app;
