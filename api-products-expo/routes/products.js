let Product = require('../model/products');
let mongoose = require('mongoose');



function getProducts(req, res) {
    try {
      let pipeline = [];
  
      // Filter by category
      if (req.query.categorie) {
        const category = req.query.categorie;
        const allowedCategories = ["makeup", "skincare", "haircare"];
        if (!allowedCategories.includes(category)) {
          return res.status(400).json({ message: "Invalid category." });
        }
        pipeline.push({ $match: { categorie: category } });
      }
  
      // Filter by specific IDs (wishlist)
      if (req.query.ids) {
        const ids = req.query.ids
          .split(",")
          .filter((id) => mongoose.Types.ObjectId.isValid(id)) // validate IDs
          .map((id) => new mongoose.Types.ObjectId(id));
  
        if (ids.length > 0) {
          pipeline.push({ $match: { _id: { $in: ids } } });
        } else {
          // No valid IDs, return empty
          return res.json({ docs: [], totalDocs: 0, totalPages: 0, page: 1, limit: parseInt(req.query.limit) || 50 });
        }
      }
  
      const aggregateQuery = Product.aggregate(pipeline);
  
      Product.aggregatePaginate(
        aggregateQuery,
        {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 50,
        },
        (err, products) => {
          if (err) {
            console.error("Aggregation error:", err);
            return res.status(500).json({ msg: "Server error", error: err.message });
          }
          res.json(products);
        }
      );
    } catch (err) {
      console.error("getProducts error:", err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  }

// Récupérer un Product par son id (GET)

     

async function getProduct(req, res) {
    let productId = req.params._id;

    try {
  
      const product = await Product.findById(productId).lean();
  
      if (!product) {
        return res.status(404).send({ message: `Aucun produit trouvé${productId}` });
      }
  
      res.json(product); 
    } catch (err) {
      res.status(500).send({ message: `Erreur serveur`  });
    }
  }
  async function addProduct(req, res) {
    try {
        const { title, desc, price, categorie, imgs } = req.body.productData;
       
        // Basic validation
        if (!title || !price || !categorie) {
            return res.status(400).json({ message: "Title, Price, and Category are required." });
        }

        const newProduct = new Product({
            title,
            desc,
            price, // MongoDB will handle Decimal128 conversion if defined in schema
            categorie,
            imgs,
           
        });

        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        console.error("Add Product Error:", err);
        res.status(500).json({ message: "Error creating product", error: err.message });
    }
}

// 2. UPDATE PRODUCT (PUT)
async function updateProduct(req, res) {
    const productId = req.params._id; // Ensure your route uses :id
   
    try {
        // { new: true } returns the updated document instead of the old one
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            req.body.productData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(updatedProduct);
    } catch (err) {
        console.error("Update Product Error:", err);
        res.status(500).json({ message: "Error updating product", error: err.message });
    }
}

// 3. DELETE PRODUCT (DELETE)
async function deleteProduct(req, res) {
    const productId = req.params._id;
console.log(productId)
    try {
        const deletedProduct = await Product.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product deleted successfully", id: productId });
    } catch (err) {
        console.error("Delete Product Error:", err);
        res.status(500).json({ message: "Error deleting product", error: err.message });
    }
}

// Export all functions
module.exports = { 
    getProduct, 
    getProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct 
};