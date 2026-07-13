const express = require("express");
const app = express();
const PORT = 3000;

const { requestLogger, errorHandler } = require("./middleware");

const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({
    message: "🚀 Welcome to the Node.js Workshop Server!",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      products: "/api/products",
    },
  });
});

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n✅ Server is running on http://localhost:${PORT}`);
  console.log(`📚 API Endpoints:`);
  console.log(`   GET    /`);
  console.log(`   GET    /api/users`);
  console.log(`   GET    /api/users/:id`);
  console.log(`   POST   /api/users`);
  console.log(`   PUT    /api/users/:id`);
  console.log(`   DELETE /api/users/:id`);
  console.log(`   GET    /api/products`);
  console.log(`   GET    /api/products/:id`);
  console.log(`   POST   /api/products`);
  console.log(`   PUT    /api/products/:id`);
  console.log(`   DELETE /api/products/:id\n`);
});
