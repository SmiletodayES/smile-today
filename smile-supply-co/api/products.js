const { getPublicCatalog } = require("../lib/products-data");

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.status(200).json({ products: getPublicCatalog() });
};
