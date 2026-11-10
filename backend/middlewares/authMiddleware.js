const jwt = require('jsonwebtoken');
const authModel = require('../models/authModel');

async function authMiddleware(req, res, next) {
  const authorization = req.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thieu Access Token.' });
  }

  const token = authorization.slice(7).trim();
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'coffeShop',
      audience: 'coffeShop-web',
    });
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401).json({ message: 'Token khong hop le.' });
    }
    const user = await authModel.findPublicById(userId);
    if (!user || user.trang_thai !== 'HOAT_DONG') {
      return res.status(401).json({ message: 'Tai khoan khong con hoat dong.' });
    }
    req.user = user;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token da het han. Vui long dang nhap lai.' });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Token khong hop le.' });
    }
    return next(err);
  }
}

module.exports = authMiddleware;
