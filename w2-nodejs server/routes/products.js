const express = require("express");
const router = express.Router();

let products = [
  { id: 1, name: "Laptop", price: 999.99, category: "Electronics" },
  { id: 2, name: "Headphones", price: 49.99, category: "Electronics" },
  { id: 3, name: "Notebook", price: 4.99, category: "Stationery" },
];

let nextId = 4;

router.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Node.js Workshop");
  next();
});

router.get("/", (req, res) => {
  let result = products;

  if (req.query.category) {
    result = products.filter(
      (p) => p.category.toLowerCase() === req.query.category.toLowerCase()
    );
  }

  res.json({
    success: true,
    count: result.length,
    data: result,
  });
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: `Product with id ${id} not found`,
    });
  }

  res.json({ success: true, data: product });
});

router.post("/", (req, res) => {
  const { name, price, category } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: "Please provide both 'name' and 'price'",
    });
  }

  const newProduct = {
    id: nextId++,
    name,
    price: parseFloat(price),
    category: category || "General",
  };

  products.push(newProduct);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: newProduct,
  });
});

router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Product with id ${id} not found`,
    });
  }

  if (req.body.price !== undefined) {
    req.body.price = parseFloat(req.body.price);
  }

  products[index] = { ...products[index], ...req.body, id };

  res.json({
    success: true,
    message: "Product updated successfully",
    data: products[index],
  });
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Product with id ${id} not found`,
    });
  }

  const deleted = products.splice(index, 1);

  res.json({
    success: true,
    message: "Product deleted successfully",
    data: deleted[0],
  });
});

module.exports = router;
