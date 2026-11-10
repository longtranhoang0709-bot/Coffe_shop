const multer = require("multer");

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB / anh
    files: 1,
    fields: 1,
    parts: 2,
  },
  fileFilter: (_req, file, done) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return done(new Error("Chi cho phep JPEG, PNG, WEBP."));
    }
    done(null, true);
  },
});

// Bat loi Multer tai route, tranh errorMiddleware chung tra loi 500.
function productUploadMiddleware(req, res, next) {
  uploader.single("image")(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Anh vuot qua 3 MB." });
    }
    return res
      .status(400)
      .json({ message: error.message || "File tai len khong hop le." });
  });
}

module.exports = productUploadMiddleware;
