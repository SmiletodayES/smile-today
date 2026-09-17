// One-time helper: once this is deployed (with real PRINTIFY_API_TOKEN /
// PRINTIFY_SHOP_ID env vars set), visit:
//   https://YOUR-DOMAIN/api/debug-catalog?key=YOUR_ADMIN_DEBUG_KEY
// to see your shop's real product + variant IDs as JSON, so you can copy
// them into lib/products-data.js. Delete this file (or remove
// ADMIN_DEBUG_KEY) once you're done — it's not meant to stay live long-term.

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const providedKey = event.queryStringParameters && event.queryStringParameters.key;
  if (!process.env.ADMIN_DEBUG_KEY || providedKey !== process.env.ADMIN_DEBUG_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const apiToken = process.env.PRINTIFY_API_TOKEN;
  if (!apiToken) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing PRINTIFY_API_TOKEN" }) };
  }

  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "User-Agent": "SmileSupplyCo-Debug/1.0",
  };

  try {
    const shopsRes = await fetch("https://api.printify.com/v1/shops.json", { headers });
    const shops = await shopsRes.json();

    const shopId = process.env.PRINTIFY_SHOP_ID || (shops[0] && shops[0].id);
    if (!shopId) {
      return {
        statusCode: 200,
        body: JSON.stringify({ shops, note: "No shop id resolved — set PRINTIFY_SHOP_ID." }),
      };
    }

    const productsRes = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products.json`,
      { headers }
    );
    const productsData = await productsRes.json();
    const products = (productsData.data || productsData || []).map((p) => ({
      id: p.id,
      title: p.title,
      variants: (p.variants || [])
        .filter((v) => v.is_enabled)
        .map((v) => ({ id: v.id, title: v.title, price: v.price })),
    }));

    return { statusCode: 200, body: JSON.stringify({ shopId, products }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
