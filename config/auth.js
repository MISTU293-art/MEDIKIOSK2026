module.exports = {
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'medikiosk_access_jwt_super_secret_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'medikiosk_refresh_jwt_super_secret_key_2026',
  ACCESS_TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  COOKIE_NAME: 'medikiosk_refresh_token',
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
};
