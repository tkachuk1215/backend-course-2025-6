const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const multer = require("multer");

// =====================
// Commander (з Частини 1)
// =====================
const program = new Command();

program
  .requiredOption("-h, --host <host>", "Server host")
  .requiredOption("-p, --port <port>", "Server port")
  .requiredOption("-c, --cache <path>", "Cache directory");

program.parse(process.argv);
const opts = program.opts();

const HOST = opts.host;
const PORT = parseInt(opts.port, 10);
const CACHE_DIR = path.resolve(process.cwd(), opts.cache);

// Створення cache директорії
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Файл для збереження інвентаря
const DATA_FILE = path.join(CACHE_DIR, "inventory.json");

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// =====================
// Express
// =====================
const app = express();

app.use(express.static(__dirname));

// =====================
// Multer для фото
// =====================
const photosDir = path.join(CACHE_DIR, "photos");

if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, photosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });

// =====================
// POST /register
// =====================
app.post("/register", upload.single("photo"), (req, res) => {
  const inventoryName = req.body.inventory_name;
  const description = req.body.description || "";
  const photo = req.file ? req.file.filename : null;

  // Перевірка обов'язкового поля
  if (!inventoryName) {
    return res.status(400).json({ error: "inventory_name is required" });
  }

  // Читаємо з файлу
  const items = JSON.parse(fs.readFileSync(DATA_FILE));

  // Створюємо новий об'єкт
  const newItem = {
    id: Date.now().toString(),
    name: inventoryName,
    description,
    photo
  };

  items.push(newItem);
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

  return res.status(201).json(newItem);
});

// =====================
// HTTP Server
// =====================
const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
