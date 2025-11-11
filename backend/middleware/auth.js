function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireOfficial(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'official') {
    return res.status(403).json({ error: 'Official access required' });
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireOfficial,
  requireStudent
};