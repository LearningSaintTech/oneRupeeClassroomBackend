const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
    promo: {
        type: String,
    }
});

module.exports = mongoose.model('promo', promoSchema);