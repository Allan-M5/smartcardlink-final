// C:\Users\ADMIN\Desktop\smartcardlink-app\server\routes\profileRoutes.js

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");

// Load Profile model (Mongoose)
const Profile = require("../models/Profile");

/* ===================== Helpers ===================== */

// Ensure a directory exists (idempotent)
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// Safe filename
function safeFileName(base) {
  return base.replace(/[^a-z0-9_\-\.]/gi, "_");
}

// Slugify (for URLs)
function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Build a minimal vCard 3.0 string
function buildVCard({ name, phone, email, company, title, card_url }) {
  let first = name || "";
  let last = "";
  if (name && name.trim().includes(" ")) {
    const parts = name.trim().split(/\s+/);
    first = parts.slice(0, -1).join(" ");
    last = parts[parts.length - 1];
  }

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${name}`,
    company ? `ORG:${company}` : null,
    title ? `TITLE:${title}` : null,
    phone ? `TEL;TYPE=CELL:${phone}` : null,
    email ? `EMAIL;TYPE=INTERNET:${email}` : null,
    card_url ? `URL:${card_url}` : null,
    "END:VCARD",
  ].filter(Boolean);

  return lines.join("\r\n");
}

// Build WhatsApp click-to-chat link (expects E.164 digits, no +)
function buildWaLink(intlDigitsOnly, message) {
  const text = encodeURIComponent(message || "");
  return `https://wa.me/${intlDigitsOnly}${text ? `?text=${text}` : ""}`;
}

// Create nodemailer transporter if env set
function getTransporter() {
  const user = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_EMAIL_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/* ===================== Setup ===================== */

const vcardsDir = path.join(__dirname, "../vcards");
ensureDir(vcardsDir);

const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`).replace(/\/+$/, "");

/* ===================== Routes ===================== */

// GET all profiles
router.get("/profiles", async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ createdAt: -1 });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profiles", error: String(err) });
  }
});

// GET profile by ID
router.get("/profiles/:id", async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile", error: String(err) });
  }
});

// GET profile by full card URL (URL-encoded)
router.get("/profile/card/:encodedUrl", async (req, res) => {
  try {
    const cardUrl = decodeURIComponent(req.params.encodedUrl);
    const profile = await Profile.findOne({ card_url: cardUrl });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile", error: String(err) });
  }
});

// POST create profile -> vCard + QR + email admin/client
router.post("/profiles", async (req, res) => {
  const startedAt = Date.now();
  let vcfPath = null;
  let qrPath = null;

  try {
    // Accept common client form field names
    const name = req.body.name || req.body.fullName || "";
    const phone = req.body.phone || req.body.phone1 || req.body.phone2 || req.body.phone3 || "";
    const email = req.body.email || req.body.email1 || req.body.email2 || req.body.email3 || "";
    const company = req.body.company || "";
    const title = req.body.title || "";

    if (!name || !phone || !email || !company) {
      return res.status(400).json({ message: "Missing required fields (name, phone, email, company)" });
    }

    // Generate slug + friendly card URL which points at the popup1 client page (so camera/QR opens popup)
    const baseSlug = slugify(`${name}-${company}`) || "user";
    let slug = baseSlug;
    let card_url = "";

    for (let i = 0; i < 6; i++) {
      const candidate = `${PUBLIC_BASE_URL}/popup1/popup1.html?slug=${slug}`;
      const exists = await Profile.exists({ card_url: candidate });
      if (!exists) {
        card_url = candidate;
        break;
      }
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    if (!card_url) return res.status(500).json({ message: "Failed to generate unique card URL" });

    // 1) Save profile
    const profile = new Profile({ name, phone, email, company, card_url });
    await profile.save();

    // 2) Create vCard file
    const vcardStr = buildVCard({ name, phone, email, company, title, card_url });
    const baseName = safeFileName(`${name}_${startedAt}`);
    vcfPath = path.join(vcardsDir, `${baseName}.vcf`);
    fs.writeFileSync(vcfPath, vcardStr, "utf8");

    // 3) QR PNG for card_url (admin printing)
    qrPath = path.join(vcardsDir, `${baseName}.png`);
    await QRCode.toFile(qrPath, card_url, {
      errorCorrectionLevel: "M",
      width: 600,
      margin: 2,
    });

    const publicVcfUrl = `${PUBLIC_BASE_URL}/vcards/${path.basename(vcfPath)}`;
    const publicQrUrl = `${PUBLIC_BASE_URL}/vcards/${path.basename(qrPath)}`;

    // 4) Email (if configured)
    const transporter = getTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || null;

    // Build WhatsApp link (for admin convenience)
    const adminWhatsAppIntl = (process.env.ADMIN_WHATSAPP_NUMBER || "")
      .replace(/[^\d]/g, "")
      .replace(/^0+/, "");
    const waMessage = `New SmartCardLink QR ready for printing.\nClient: ${name}\nURL: ${card_url}`;
    const waLink = adminWhatsAppIntl ? buildWaLink(adminWhatsAppIntl, waMessage) : null;

    if (transporter && adminEmail) {
      // a) Email to client (cc admin)
      await transporter.sendMail({
        from: `"SmartCardLink" <${adminEmail}>`,
        to: email,
        cc: adminEmail,
        subject: `Your SmartCardLink is ready: ${name}`,
        text: `Hi ${name},

Your SmartCardLink is ready.

View your digital card:
${card_url}

(Attached: .vcf contact file you can save.)`,
        attachments: [{ filename: `${baseName}.vcf`, path: vcfPath }],
      });

      // b) Email to admin (QR attached for printing)
      await transporter.sendMail({
        from: `"SmartCardLink" <${adminEmail}>`,
        to: adminEmail,
        subject: `QR for printing — ${name}`,
        text: `New SmartCardLink created.

Client: ${name}
Company: ${company}
Phone: ${phone}
Email: ${email}

Client URL:
${card_url}

Public QR: ${publicQrUrl}

WhatsApp quick send: ${waLink || "(ADMIN_WHATSAPP_NUMBER not set)"}

QR PNG is attached for printing.`,
        attachments: [
          { filename: `${baseName}.png`, path: qrPath },
          { filename: `${baseName}.vcf`, path: vcfPath },
        ],
      });
    } else {
      console.warn("⚠️ ADMIN_EMAIL or ADMIN_EMAIL_PASSWORD not set — email notifications skipped.");
    }

    // 5) Respond with useful info for client and admin tools
    res.json({
      message: "Profile created, vCard & QR generated. Notifications processed (if email configured).",
      profile,
      card_url,
      vcard_url: publicVcfUrl,
      qr_url: publicQrUrl,
      admin_whatsapp_link: waLink || null,
    });
  } catch (err) {
    console.error("❌ Error creating profile:", err);
    try { if (vcfPath && fs.existsSync(vcfPath)) fs.unlinkSync(vcfPath); } catch {}
    try { if (qrPath && fs.existsSync(qrPath)) fs.unlinkSync(qrPath); } catch {}
    res.status(500).json({ message: "Error creating profile", error: String(err) });
  }
});

module.exports = router;
