/**
 * Thin wrapper around the Printify REST API.
 * Docs: https://developers.printify.com/
 */

const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Creates an order in Printify for an already-published product/variant.
 * @param {Object} params
 * @param {Array<{product_id: string, variant_id: string, quantity: number}>} params.lineItems
 * @param {Object} params.addressTo - { first_name, last_name, email, phone, address1, address2, city, region, country, zip }
 * @param {string} [params.externalId] - your own order/session id, useful for tracing in Printify's dashboard
 */
async function createPrintifyOrder({ lineItems, addressTo, externalId }) {
  const shopId = requireEnv("PRINTIFY_SHOP_ID");
  const apiToken = requireEnv("PRINTIFY_API_TOKEN");

  const body = {
    external_id: externalId,
    line_items: lineItems,
    // 1 = standard shipping for most Printify print providers.
    // Confirm valid options for your specific provider via
    // GET /v1/shops/{shop_id}/orders/shipping.json if you offer more than one.
    shipping_method: 1,
    send_shipping_notification: true,
    address_to: addressTo,
  };

  const res = await fetch(`${PRINTIFY_BASE_URL}/shops/${shopId}/orders.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "User-Agent": "SmileSupplyCo-Storefront/1.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Printify order creation failed (${res.status}): ${text}`);
  }

  return res.json();
}

module.exports = { createPrintifyOrder };
