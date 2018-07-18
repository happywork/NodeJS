/**
 * For development you can set the variables by creating a .env file on the root
 */
var fs = require('fs');
// var production = process.env.NODE_ENV === 'production';
var production = false;


var prodConfig;
if(production) {
  prodConfig = JSON.parse(fs.readFileSync(__dirname + '/build-config.json'));

  console.log('W: Build config loaded:', '\n --', prodConfig['homepage-main-new.js'], '\n --', prodConfig['main-new.js']);
}

module.exports = {
  "PRODUCTION": production,
  "DATABASE_URL": process.env.DATABASE_URL || "postgres://postgres:123456@localhost/bustabitdb",
  "BIP32_DERIVED": process.env.BIP32_DERIVED_KEY,
  "AWS_SES_KEY": process.env.AWS_SES_KEY,
  "AWS_SES_SECRET": process.env.AWS_SES_SECRET,
  "CONTACT_EMAIL": process.env.CONTACT_EMAIL || "happwork1010@gmail.com",
  "SITE_URL": process.env.SITE_URL || "marine-chain.io",
  "ENC_KEY": process.env.ENC_KEY || "enc_key_wrt",//"devkey",
  "SIGNING_SECRET": process.env.SIGNING_SECRET || "secret_wrt",
  "BANKROLL_OFFSET": parseInt(process.env.BANKROLL_OFFSET) || 0,
  "RECAPTCHA_PRIV_KEY": process.env.RECAPTCHA_PRIV_KEY || '6Ld8TkoUAAAAAMif4zL70dgy7x7YT9K-MdDZu4f2',
  "RECAPTCHA_SITE_KEY": process.env.RECAPTCHA_SITE_KEY || '6Ld8TkoUAAAAACNNx7L2C7eKtCg8m7Q6Zm8lYe_F',
  /*"BITCOIND_HOST": process.env.BITCOIND_HOST || 'localhost',
  "BITCOIND_PORT": process.env.BITCOIND_PORT || 8332,
  "BITCOIND_USER": process.env.BITCOIND_USER || 'user',
  "BITCOIND_PASS": process.env.BITCOIND_PASS || 'password',
  "BITCOIND_CERT": process.env.BITCOIND_CERT  || '',*/
  "PORT_HTTP_W":  process.env.PORT_HTTP_W || 80,
  "PORT_HTTPS_W":  process.env.PORT_HTTPS_W || 443,
  "PORT_HTTP_G":  process.env.PORT_HTTP_G || 3880,
  "PORT_HTTPS_G":  process.env.PORT_HTTPS_G || 3443,
  "MINING_FEE": process.env.MINING_FEE || 10000,
  "BUILD": prodConfig,
  "USE_HTTPS": process.env.USE_HTTPS || true,
  "HTTPS_KEY": process.env.HTTPS_KEY || './ssl/private.key',
  "HTTPS_CERT": process.env.HTTPS_CERT || './ssl/certificate.crt',
  "HTTPS_CA": process.env.HTTPS_CA || './ssl/ca_bundle.crt',
/*  "ETHEREUM_DEPOSIT_ADDR": process.env.ETHEREUM_DEPOSIT_ADDR,
  "ETHEREUM_DEPOSIT_PASS": process.env.ETHEREUM_DEPOSIT_PASS*/
};
