let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let user = require('./routes/users');
let mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');


app.use(bodyParser.json());

app.use(cookieParser());


// Use cookie-parser middleware to parse cookies 
const prefix = '/api';



mongoose.Promise = global.Promise;
const uri = 'mongodb+srv://zaouiyassine567:TxSJwbVuAYZix1CK@users.sgjydjd.mongodb.net/?appName=Users';
class TokenBucket {

  constructor(capacity, fillPerSecond) {
      this.capacity = capacity;
      this.tokens = capacity;
      setInterval(() => this.addToken(), 1000 / fillPerSecond);
  }
 
  addToken() {
      if (this.tokens < this.capacity) {
          this.tokens += 1; 
      }
  }

  take() {
      if (this.tokens > 0) {
          this.tokens -= 1;
          return true;
      }

      return false;
  }
}


const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }; 
 
mongoose.connect(uri, options) 
  .then(() => {
    console.log("Connecté à la base MongoDB assignments dans le cloud !");
    console.log("at URI = " + uri);
    console.log("vérifiez with http://localhost:8080/api/users que cela fonctionne")
    },
    err => {
      console.log('Erreur de connexion: ', err);
    });

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.use(cors({ origin: 'http://localhost:4200', credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'] }));


  


  app.use(express.urlencoded({extended: true}));
  app.use(express.json());
  let port = process.env.PORT || 8080; 


  // les routes


function limitRequests(perSecond, maxBurst) {
  const bucket = new TokenBucket(maxBurst, perSecond);

  // Return an Express middleware function
  return function limitRequestsMiddleware(req, res, next) {
      if (bucket.take()) {
          next();
      } else {
          res.status(429).send('Rate limit exceeded');
      }
  }
}





  app.route(prefix + '/signin',limitRequests(5, 10))
  .post(user.signin);


app.route(prefix + '/signup',limitRequests(5, 10))
.post(user.signup);
app.route(prefix + '/verify',limitRequests(5, 10))
  .get(user.verifyToken); 
  app.get(
    `${prefix}/getusers/`,
    limitRequests(5, 10),   
    user.getAllUsers         
  );
  app.post(
    `${prefix}/getuser`,
    limitRequests(5, 10),   
    user.getUser           
  );
   app.post( 
    `${prefix}/wishlist/:productId`,
    limitRequests(5, 10),   
    user.addToWishlist           
  );
  app.put( 
    `${prefix}/update/:_id`,
    limitRequests(5, 10),   
    user.adminUpdateUser        
  );
  app.post( 
    `${prefix}/addUser/`,
    limitRequests(5, 10),   
    user.adminAddUser        
  );
  app.post(
    `${prefix}/getWishlist/`,
    limitRequests(5, 10),   
    user.getWishlist           
  );
  app.delete(
    `${prefix}/delete/:_id`,
    limitRequests(5, 10),   
    user.deleteUser
    );
  app.post('/api/wishlist/:productId', user.removeFromWishlist);

// On démarre le serveur
app.listen(port, "0.0.0.0");
console.log('Serveur démarré sur http://localhost:' + port);


module.exports = app;


