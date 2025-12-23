
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.get('/', (req, res) => {
  res.send('PromptScore backend running');
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO users(email, password, role, usage) VALUES ($1,$2,'free',0)",
    [email, hash]
  );
  res.json({ success: true });
});

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === "mdiakite1980@gmail.com" && password === "mdiakite1980") {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get('/admin/users', async (req, res) => {
  const { rows } = await pool.query("SELECT email, role FROM users");
  res.json(rows);
});

app.post('/admin/activate', async (req, res) => {
  const { email } = req.body;
  await pool.query("UPDATE users SET role='premium' WHERE email=$1", [email]);

  await transporter.sendMail({
    from: `PromptScore <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Votre compte PromptScore Premium est activé 🎉",
    text: "Bonjour,\n\nVotre compte PromptScore Premium est maintenant actif.\n\n— L'équipe PromptScore"
  });

  res.json({ success: true });
});

app.post('/use', async (req, res) => {
  const { email } = req.body;
  const { rows } = await pool.query("SELECT role, usage FROM users WHERE email=$1", [email]);
  if (!rows.length) return res.status(404).end();

  const user = rows[0];
  if (user.role === 'free' && user.usage >= 3) {
    return res.json({ blocked: true });
  }

  await pool.query("UPDATE users SET usage = usage + 1 WHERE email=$1", [email]);
  res.json({ allowed: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend running on port", PORT));
