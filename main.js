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
app.use(express.json());

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
// GET /inventory
// =====================
app.get("/inventory", (req, res) => {
  const items = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  res.status(200).json(items);
});

// =====================
// GET /inventory/:id
// =====================
app.get("/inventory/:id", (req, res) => {
  const id = req.params.id;

  const items = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  const item = items.find(x => x.id === id);

  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }

  res.status(200).json(item);
});

// =====================
// PUT /inventory/:id
// =====================
app.put("/inventory/:id", (req, res) => {
  const id = req.params.id;
  const { name, description } = req.body;

  const items = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  const itemIndex = items.findIndex(x => x.id === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: "Not found" });
  }

  // Оновлюємо тільки те, що передали
  if (name !== undefined) {
    items[itemIndex].name = name;
  }

  if (description !== undefined) {
    items[itemIndex].description = description;
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

  res.status(200).json(items[itemIndex]);
});

// =====================
// GET /inventory/:id/photo
// =====================
app.get("/inventory/:id/photo", (req, res) => {
  const id = req.params.id;

  const items = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  const item = items.find(x => x.id === id);

  // Якщо предмет не знайдено
  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }

  // Якщо фото відсутнє
  if (!item.photo) {
    return res.status(404).json({ error: "Photo not found" });
  }

  const photoPath = path.join(CACHE_DIR, "photos", item.photo);

  // Якщо файл фізично не існує
  if (!fs.existsSync(photoPath)) {
    return res.status(404).json({ error: "Photo file missing" });
  }

  // Відправляємо файл
  res.status(200).sendFile(photoPath);
});

// =====================
// PUT /inventory/:id/photo
// =====================
app.put("/inventory/:id/photo", upload.single("photo"), (req, res) => {
  const id = req.params.id;

  // Фото обовʼязкове
  if (!req.file) {
    return res.status(400).json({ error: "Photo is required" });
  }

  const items = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  const itemIndex = items.findIndex(x => x.id === id);

  // Якщо предмет не знайдено
  if (itemIndex === -1) {
    return res.status(404).json({ error: "Not found" });
  }

  const oldPhoto = items[itemIndex].photo;

  // Якщо було старе фото — видаляємо його
  if (oldPhoto) {
    const oldPhotoPath = path.join(CACHE_DIR, "photos", oldPhoto);
    if (fs.existsSync(oldPhotoPath)) {
      fs.unlinkSync(oldPhotoPath);
    }
  }

  // Записуємо нове фото
  items[itemIndex].photo = req.file.filename;

  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

  res.status(200).json(items[itemIndex]);
});

// =====================
// HTTP Server
// =====================
const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
