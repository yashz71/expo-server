let mongoose = require('mongoose');
var aggregatePaginate = require('mongoose-aggregate-paginate-v2');
let Schema = mongoose.Schema;

let ProductsSchema = Schema({
    title: String,
	desc: String,
	price: Number,
	categorie:String,
    imgs:[String]
});
ProductsSchema.plugin(aggregatePaginate);

// C'est à travers ce modèle Mongoose qu'on pourra faire le CRUD
module.exports = mongoose.model('Products', ProductsSchema);
