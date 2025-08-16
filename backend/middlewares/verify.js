const jwt=require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 Auth header:', authHeader); // Debug log
  console.log('🔑 Extracted token:', token ? token.substring(0, 20) + '...' : 'No token'); // Debug log

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Make sure JWT_SECRET matches what you used during login
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