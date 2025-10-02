module.exports = {
  secret: process.env.JWT_SECRET || 'change-me-in-prod',
  jwtExpiration: Number(process.env.JWT_EXPIRATION || 86400), // seconds
  jwtRefreshExpiration: Number(process.env.JWT_REFRESH_EXPIRATION || 172800),
};
