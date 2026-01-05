let express = require('express');
let app = express();
let product = require('./routes/products');
let lr= require('./middleware/ratelimit.js');
const cors = require('cors');
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Increase the limit for URL-encoded bodies
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
//mongoose.set('debug', true);


// remplacer toute cette chaine par l'URI de connexion à votre propre base dans le cloud s
const uri = '';
app.set('view engine', 'ejs');

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose.connect(uri, options)
  .then(() => {
    console.log("Connecté à la base MongoDB products dans le cloud !");
    console.log("at URI = " + uri);
    console.log("vérifiez with http://localhost:8010/api/products que cela fonctionne")
    },
    err => {
      console.log('Erreur de connexion: ', err);
    });

// Pour accepter les connexions cross-domain (CORS)
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Pour les formulaires
app.use(express.urlencoded({extended: true}));
app.use(express.json());

let port = process.env.PORT || 3000;

// les routes
const prefix = '/api';




app.route(prefix + '/products')
  .get(lr.limitRequests(5, 10), product.getProducts);
  
  app.route(prefix + '/products_detail/:_id')
  .get(lr.limitRequests(5, 10), product.getProduct);
  app.post(
    `${prefix}/updateProduct/:_id`,
    lr.limitRequests(5, 10),   
    product.updateProduct
    );
    app.delete(
      `${prefix}/delete/:_id`,
      lr.limitRequests(5, 10),   
      product.deleteProduct
      );

  app.post(
    `${prefix}/addProduct`,
    lr.limitRequests(5, 10),   
    product.addProduct
    );
// On démarre le serveur
app.listen(port, "0.0.0.0");
console.log('Serveur démarré sur http://localhost:' + port);

module.exports = app;


