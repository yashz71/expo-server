let mongoose = require('mongoose');
var aggregatePaginate = require('mongoose-aggregate-paginate-v2');
let Schema = mongoose.Schema;

let UserSchema = Schema({
    id: Number,
    wishlist: [String],
    userName: String,
    userMail: String,
    userPassword: String,
    role:String
});
UserSchema.plugin(aggregatePaginate);
// C'est à travers ce modèle Mongoose qu'on pourra faire le CRUD
module.exports = mongoose.model('Users', UserSchema);
