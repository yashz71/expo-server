let Users = require('../model/users');
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const {secret} = require("../config/auth.config");
const { Validator } = require('node-input-validator');
require("cookie-parser");
let axios = require("axios"); // call Products microservice



function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, secret);
    req.user = { id: decoded.id,userName:decoded.username, userMail:decoded.usermail }; // attach userId to req
    next(); // continue to the next route handler
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

async function getUser(req, res){

try {
  const user = await Users.findOne({ userMail: userMail });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const response = {
    userName: user.userName,
    userMail: user.userMail
  };

  res.json(response);
} catch (err) {
  res.status(500).json({ msg: "Server error" });
}
}
 


async function verifyToken(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).send({ success: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, secret);
    return res.status(200).send({ success: true, userId: decoded.id });
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).send({ success: false, message: 'Invalid or expired token.' });
  }
}



async function getWishlist(req, res) {
  try {
    // Extract userMail from request (body, query, or params)
    const { userMail } = req.body; 

    // Find the user by their email
    const user = await Users.findOne({ userMail: userMail });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const wishlistIds = user.wishlist || [];

    // If wishlist is empty, return immediately to save a microservice call
    if (wishlistIds.length === 0) {
      return res.json([]); 
    }

    // Call Products microservice to get full product details
    const productServiceUrl = "http://localhost:3000/api/products"; 
    const response = await axios.get(productServiceUrl, {
      params: { ids: wishlistIds.join(",") }, 
    });

    // Return the full product data from the microservice
    res.json(response.data); 
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    res.status(500).json({ msg: "Server error" });
  }
}
async function addToWishlist(req, res) {
  try {
    const { productId } = req.params;
    // Assuming userMail is passed in the request body or extracted from a token
    const { userMail } = req.body; 

    // Find user by email and add the productId to wishlist only if it doesn't exist ($addToSet)
    const user = await Users.findOneAndUpdate(
      { userMail: userMail },
      { $addToSet: { wishlist: productId } },
      { new: true } // Returns the updated document
    );

    if (!user) {
      console.log("User not found with email: ", userMail);
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ wishlist: user.wishlist });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
async function removeFromWishlist(req, res) {
  try {
    const { productId } = req.params;
    // Extract userMail from the request body or auth context
    const { userMail } = req.body; 

    // Find user by email and remove the productId from the wishlist array
    const user = await Users.findOneAndUpdate(
      { userMail: userMail },
      { $pull: { wishlist: productId } },
      { new: true } // Returns the updated document after removal
    );

    if (!user) {
      console.log("User not found with email: ", userMail);
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ wishlist: user.wishlist });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function signup(req, res) {
  try {
    const v = new Validator(req.body, {
      userName: 'required|maxLength:10',
      userMail: 'required|email',
      userPassword: 'required|minLength:10|regex:^[a-zA-Z0-9!@#$%^&*]+$'
    });

    const matched = await v.check();
    
    if (!matched) {
      if (!req.body.userPassword) {
        return res.status(400).send({ message: "Invalid password" });
      } else if (!req.body.userMail) {
        return res.status(400).send({ message: "Invalid email" });
      } else {
        return res.status(400).send({ message: "Invalid username (too long)" });
      }
    }

    // Check if user exists
    const existingUser = await Users.findOne({ 
      $or: [
        { userName: req.body.userName },
        { userMail: req.body.userMail }
      ]
    }).exec();

    if (existingUser) {
      return res.status(400).send({ message: "User already exists" });
    }

    // Create new user
    const newUser = new Users({ 
      userName: req.body.userName,
      userMail: req.body.userMail,
      userPassword: bcrypt.hashSync(req.body.userPassword, 14)
    });

    await newUser.save();
    return res.status(201).send({ message: "User registered successfully!" });

  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).send({ message: "Internal server error" });
  }
}
async function signin(req, res) {
  try {
    // Input validation
    const v = new Validator(req.body, {
      userName: 'required|maxLength:10',
      userPassword: 'required'
    });

    const matched = await v.check();
    
    if (!matched) {
      return res.status(422).send({ message: "Invalid credentials" });
    }

    // Find user
    const user = await Users.findOne({ userName: req.body.userName }).exec();
    
    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    }

    // Verify password
    const passwordIsValid = bcrypt.compareSync(
      req.body.userPassword,
      user.userPassword
    );

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid Password!"
      });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, secret, {
      expiresIn: 86400 
    });
    
    res.status(200).send({
      id: user._id,
      username: user.userName,
      usermail: user.userMail,
      token,
      message: "Connected successfully"
    });

  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
}
async function getAllUsers(req, res) {
  try {
    // Return all users but exclude passwords for security
    const users = await Users.find({}).select('-userPassword');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
}

// 2. Update a user (e.g., change role or username)
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If password is being updated, it must be hashed
    if (updates.userPassword) {
      updates.userPassword = bcrypt.hashSync(updates.userPassword, 14);
    }

    const updatedUser = await Users.findByIdAndUpdate(id, updates, { new: true }).select('-userPassword');
    
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Error updating user" });
  }
}

// 3. Delete a user
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const deletedUser = await Users.findByIdAndDelete(id);
    
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
}

// --- MODIFIED SIGNIN (To include Role) ---
async function signin(req, res) {
  try {
    const user = await Users.findOne({ userName: req.body.userName }).exec();
    if (!user) return res.status(404).send({ message: "User Not found." });

    const passwordIsValid = bcrypt.compareSync(req.body.userPassword, user.userPassword);
    if (!passwordIsValid) return res.status(401).send({ message: "Invalid Password!" });

    // 🔑 ADD ROLE TO TOKEN
    const token = jwt.sign(
      { id: user._id, role: user.role, usermail: user.userMail }, 
      secret, 
      { expiresIn: 86400 }
    );
    
    res.status(200).send({
      id: user._id,
      username: user.userName,
      usermail: user.userMail,
      role: user.role || 'user', // Send role to frontend for UI logic
      token,
      message: "Connected successfully"
    });
  } catch (err) {
    res.status(500).send({ message: "Internal server error" });
  }
}

// --- MODIFIED AUTH MIDDLEWARE (To check Admin) ---
function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Require Admin Role!" });
  }
}

module.exports = {
  signin,
  signup,
  verifyToken,
  getUser,
  addToWishlist,
  authMiddleware,
  isAdmin, // Export this to protect routes
  getWishlist,
  removeFromWishlist,
  getAllUsers, // New
  updateUser,  // New
  deleteUser   // New
};