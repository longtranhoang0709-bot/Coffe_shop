// Su dung sau authMiddleware, de lay thong tin nguoi dung tu token va luu vao req.user
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Ban chua dang nhap.' });
    }
    if (!roles.includes(req.user.vai_tro)) {
      return res.status(403).json({ message: 'Ban khong co quyen truy cap.' });
    }
    return next();
  };
}

module.exports = allowRoles;
