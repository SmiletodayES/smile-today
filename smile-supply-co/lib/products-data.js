/**
 * Single source of truth for the product catalog.
 *
 * IMPORTANT — placeholders you must replace before going live:
 *   - printifyProductId  (one per product)
 *   - printifyVariantId  (one per color/size combination)
 *
 * How to find the real values:
 *   1. In Printify, create/upload the product (choose a blueprint + print
 *      provider, add your design, pick the colors/sizes you want to sell,
 *      publish it to "My stores" so it belongs to your shop).
 *   2. Call GET https://api.printify.com/v1/shops/{shop_id}/products.json
 *      (with your API token) to get the product's numeric "id" ->
 *      that's printifyProductId.
 *   3. In that same product's JSON, the "variants" array lists every
 *      color/size combination with its own numeric "id" -> that's
 *      printifyVariantId. Match by the variant's "title" (e.g. "Black / M").
 *
 * priceCents is what the CUSTOMER pays via Stripe, in euro cents.
 * Set it to (Printify's cost to you) + shipping + your margin.
 */

const PRODUCTS = {
  hoodie: {
    id: "hoodie",
    name: "Smile Hoodie",
    tagline: "Heavyweight fleece, hand-drawn smile on the chest.",
    description:
      "Our signature hoodie: relaxed fit, brushed-fleece interior, and the Smile Supply Co. logo printed on the chest. Built for beach mornings and cold nights.",
    image: "smile-hoodie",
    priceCents: 4500,
    printifyProductId: "REPLACE_PRODUCT_ID__hoodie",
    colors: ["Black", "Sand", "Sunset Orange"],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  tshirt: {
    id: "tshirt",
    name: "Smile Tee",
    tagline: "Soft cotton, everyday wear.",
    description:
      "A everyday cotton tee with the hand-drawn smiley on the front. Light, breathable, made to be lived in.",
    image: "smile-tee",
    priceCents: 2500,
    printifyProductId: "REPLACE_PRODUCT_ID__tshirt",
    colors: ["Black", "Sand", "Sunset Orange"],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  cap: {
    id: "cap",
    name: "Smile Cap",
    tagline: "Low-profile, adjustable strap.",
    description:
      "A low-profile dad cap with an embroidered-look smiley and an adjustable strap for an easy fit.",
    image: "smile-cap",
    priceCents: 2200,
    printifyProductId: "REPLACE_PRODUCT_ID__cap",
    colors: ["Black", "Sand", "Sunset Orange"],
    sizes: ["One Size"],
  },
};

// Builds a placeholder variant id that's easy to find-and-replace,
// e.g. REPLACE_VARIANT_ID__hoodie__Black__M
function variantPlaceholder(productId, color, size) {
  return `REPLACE_VARIANT_ID__${productId}__${color.replace(/\s+/g, "_")}__${size.replace(/\s+/g, "_")}`;
}

function getVariantId(productId, color, size) {
  const product = PRODUCTS[productId];
  if (!product) return null;
  if (!product.colors.includes(color) || !product.sizes.includes(size)) return null;
  return variantPlaceholder(productId, color, size);
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

module.exports = { PRODUCTS, getVariantId, getPublicCatalog, variantPlaceholder };
