function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error('[API Error]', err);
  return res.status(500).json({ message: 'Loi may chu. Vui long thu lai sau.' });
}

module.exports = errorMiddleware;
