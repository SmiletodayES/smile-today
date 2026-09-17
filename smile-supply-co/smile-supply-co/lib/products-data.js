/**
 * Single source of truth for the product catalog.
 *
 * These are the REAL Printify product + variant IDs for the Smile Supply
 * Co. shop (pulled via the debug-catalog helper — see README). If you add
 * more colors/sizes in Printify later, add them here too (and to the
 * `variantIds` map) or the site won't know about them.
 *
 * priceCents is what the CUSTOMER pays via Stripe, in euro cents.
 */

const PRODUCTS = {
  hoodie: {
    id: "hoodie",
    name: "Smile Hoodie",
    tagline: "Heavyweight fleece, hand-drawn smile on the chest.",
    description:
      "Our signature hoodie: relaxed fit, brushed-fleece interior, and the Smile Supply Co. logo printed on the chest. Built for beach mornings and cold nights.",
    image: "smile-hoodie",
    priceCents: 3500,
    printifyProductId: "6aac0f056b428027980c863a",
    colors: ["White"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    variantIds: {
      "White-S": 32910,
      "White-M": 32911,
      "White-L": 32912,
      "White-XL": 32913,
      "White-2XL": 32914,
      "White-3XL": 32915,
      "White-4XL": 32916,
      "White-5XL": 32917,
    },
  },
  tshirt: {
    id: "tshirt",
    name: "Smile Tee",
    tagline: "Soft cotton, everyday wear.",
    description:
      "A everyday cotton tee with the hand-drawn smiley on the front. Light, breathable, made to be lived in.",
    image: "smile-tee",
    priceCents: 1999,
    printifyProductId: "6aac13bbfab3e89cfa0e2f43",
    colors: ["White"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    variantIds: {
      "White-S": 93739,
      "White-M": 93740,
      "White-L": 93741,
      "White-XL": 93742,
      "White-2XL": 93743,
      "White-3XL": 93744,
    },
  },
  cap: {
    id: "cap",
    name: "Smile Cap",
    tagline: "Low-profile, adjustable strap.",
    description:
      "A low-profile dad cap with an embroidered-look smiley and an adjustable strap for an easy fit.",
    image: "smile-cap",
    priceCents: 1999,
    printifyProductId: "6aac122ba53e7ba0bb03d46a",
    colors: ["White"],
    sizes: ["One size"],
    variantIds: {
      "White-One size": 82434,
    },
  },
};

function getVariantId(productId, color, size) {
  const product = PRODUCTS[productId];
  if (!product) return null;
  if (!product.colors.includes(color) || !product.sizes.includes(size)) return null;
  return product.variantIds[`${color}-${size}`] || null;
}

// Sanitized catalog for the public-facing /api/products endpoint —
// never leak Printify IDs to the browser.
function getPublicCatalog() {
  return Object.values(PRODUCTS).map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    image: p.image,
    priceCents: p.priceCents,
    colors: p.colors,
    sizes: p.sizes,
  }));
}

module.exports = { PRODUCTS, getVariantId, getPublicCatalog };
