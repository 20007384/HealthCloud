const jwt=require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || '123456';
    console.log(' Using JWT secret:', JWT_SECRET.substring(0, 10) + '...'); // Debug log
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(' Token decoded successfully:', { userId: decoded.userId, role: decoded.role, exp: new Date(decoded.exp * 1000) });
    
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports={verifyToken};