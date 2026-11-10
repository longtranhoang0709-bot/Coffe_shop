
require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const pool = require("./config/db");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const authRoutes = require('./routes/authRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

// Cau hinh cho phep frontend ket noi
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Middleware xu ly request
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use(errorMiddleware);

// Trang kiem tra Backend
app.get("/", (req, res) => {
  res.json({
    message: "coffeShop Backend dang hoat dong",
  });
});

// Kiem tra ket noi MySQL
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS database_name, 1 AS connected"
    );

    res.json({
      status: "ok",
      database: rows[0].database_name,
      connected: rows[0].connected === 1,
    });
  } catch (error) {
    console.error("Loi MySQL:", error.message);

    res.status(503).json({
      status: "error",
      message: "Khong ket noi duoc database",
    });
  }
});

// API khong ton tai
app.use((req, res) => {
  res.status(404).json({
    message: "Khong tim thay API",
  });
});

// Xu ly loi chung
app.use((error, req, res, next) => {
  console.error("Loi server:", error);

  res.status(500).json({
    message: "Loi noi bo server",
  });
});

// Khoi dong sau khi kiem tra MySQL
async function start() {
  try {
    await pool.query("SELECT 1");

    console.log("MySQL: ket noi thanh cong");

    const server = app.listen(PORT, () => {
      console.log(`Backend: http://localhost:${PORT}`);
      console.log(
        `Kiem tra: http://localhost:${PORT}/api/health`
      );
    });

    const shutdown = () => {
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error(
      "Khong the khoi dong Backend:",
      error.message
    );

    await pool.end();
    process.exit(1);
  }
}

start();
