const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require('./user.model');
db.role = require('./role.model');
db.token = require('./token.model');
db.chain = require('./chain.model');
db.wallet = require('./wallet.model');
db.bitcoin = require('./bitcoin.model');
db.serie = require('./serie.model');
db.media = require('./media.model');
db.element = require('./element.model');
db.post = require('./post.model');
db.ordinal = require('./ordinal.model');
db.medium = require('./medium.model');
db.whitelist = require('./whitelist.model');
db.trait = require('./trait.model');
db.sketch = require('./sketch.model');
db.gallery = require('./gallery.model');
db.exhibition = require('./exhibition.model');
db.palette = require('./palette.model');
db.tag = require('./tag.model');
db.category = require('./category.model');
db.comment = require('./comment.model');
db.twitter = require('./twitter.model');
db.discord = require('./discord.model');
db.session = require('./session.model');
db.section = require('./section.model');
db.auth = require('./auth.model');
db.refreshToken = require('./refreshToken.model');
db.apply = require('./apply.model');
db.transaction = require('./transaction.model');
db.fiat = require('./fiat.model');
db.payment = require('./payment.model');
db.customer = require('./customer.model');
db.order = require('./order.model');
db.psbt = require('./psbt.model');
db.bid = require('./bid.model');
db.mint = require('./mint.model');
db.buying = require('./buying.model');

db.ROLES = ['user', 'admin', 'creator'];

module.exports = db;
