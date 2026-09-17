// Smile Supply Co. — storefront front-end.
// Loads the catalog from /api/products, renders cards + the product modal,
// and starts Stripe Checkout via /api/create-checkout-session.

// Real product photography, where we have it — falls back to the ART line
// icons below for anything not photographed yet.
const PHOTOS = {
  "smile-tee": "images/tee-mockup.png",
};

const ART = {
  "smile-hoodie": `<svg viewBox="0 0 100 100" fill="none" stroke="#17140F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 32 Q50 8 70 32" />
      <path d="M38 34 L50 26 L62 34 L80 38 L73 50 L64 45 L64 88 L36 88 L36 45 L27 50 L20 38 Z"/>
      <line x1="45" y1="38" x2="45" y2="50"/>
      <line x1="55" y1="38" x2="55" y2="50"/>
      <path d="M33 68 Q50 76 67 68"/>
    </svg>`,
  "smile-tee": `<svg viewBox="0 0 100 100" fill="none" stroke="#17140F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M38 18 L50 26 L62 18 L80 28 L72 42 L64 37 L64 84 L36 84 L36 37 L28 42 L20 28 Z"/>
    </svg>`,
  "smile-cap": `<svg viewBox="0 0 100 100" fill="none" stroke="#17140F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 55 Q50 20 80 55 Q80 65 68 65 Q50 58 32 65 Q20 65 20 55 Z"/>
      <path d="M78 58 Q94 58 92 66 Q84 68 76 64 Z"/>
    </svg>`,
};

const BG_CLASSES = ["bg-1", "bg-2", "bg-3"];

let catalog = [];
let activeProduct = null;
let selectedColor = null;
let selectedSize = null;
let quantity = 1;

const shopGrid = document.getElementById("shop");
const modal = document.getElementById("product-modal");

async function loadCatalog() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();
    catalog = data.products || [];
    renderGrid();
  } catch (err) {
    shopGrid.innerHTML = `<p class="loading">Couldn't load the shop right now — please refresh.</p>`;
  }
}

function formatPrice(cents) {
  return `€${(cents / 100).toFixed(2)}`;
}

function artFor(product) {
  if (PHOTOS[product.image]) {
    return `<img src="${PHOTOS[product.image]}" alt="${product.name}" loading="lazy">`;
  }
  return ART[product.image] || "";
}

function renderGrid() {
  shopGrid.innerHTML = "";
  catalog.forEach((product, i) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-art ${BG_CLASSES[i % BG_CLASSES.length]}">${artFor(product)}</div>
      <h3>${product.name}</h3>
      <p class="price">${formatPrice(product.priceCents)}</p>
      <p class="tagline">${product.tagline}</p>
    `;
    card.addEventListener("click", () => openModal(product));
    shopGrid.appendChild(card);
  });
}

function openModal(product) {
  activeProduct = product;
  selectedColor = product.colors[0];
  selectedSize = product.sizes[0];
  quantity = 1;

  document.getElementById("modal-image").innerHTML = artFor(product);
  document.getElementById("modal-name").textContent = product.name;
  document.getElementById("modal-tagline").textContent = product.tagline;
  document.getElementById("modal-description").textContent = product.description;
  document.getElementById("modal-error").classList.add("hidden");

  renderColorPills(product.colors);
  renderSizePills(product.sizes);
  updateQtyDisplay();
  updatePrice();

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function renderColorPills(colors) {
  const container = document.getElementById("modal-colors");
  container.innerHTML = "";
  colors.forEach((color) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pill" + (color === selectedColor ? " selected" : "");
    pill.textContent = color;
    pill.addEventListener("click", () => {
      selectedColor = color;
      renderColorPills(colors);
    });
    container.appendChild(pill);
  });
}

function renderSizePills(sizes) {
  const container = document.getElementById("modal-sizes");
  container.innerHTML = "";
  sizes.forEach((size) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pill" + (size === selectedSize ? " selected" : "");
    pill.textContent = size;
    pill.addEventListener("click", () => {
      selectedSize = size;
      renderSizePills(sizes);
    });
    container.appendChild(pill);
  });
}

function updateQtyDisplay() {
  document.getElementById("qty-value").textContent = quantity;
}

function updatePrice() {
  if (!activeProduct) return;
  document.getElementById("modal-price").textContent = formatPrice(
    activeProduct.priceCents * quantity
  );
}

document.getElementById("qty-minus").addEventListener("click", () => {
  quantity = Math.max(1, quantity - 1);
  updateQtyDisplay();
  updatePrice();
});

document.getElementById("qty-plus").addEventListener("click", () => {
  quantity = Math.min(10, quantity + 1);
  updateQtyDisplay();
  updatePrice();
});

document.querySelector(".modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

document.getElementById("checkout-btn").addEventListener("click", async () => {
  const errorEl = document.getElementById("modal-error");
  errorEl.classList.add("hidden");
  const btn = document.getElementById("checkout-btn");
  btn.disabled = true;
  btn.textContent = "Redirecting to checkout…";

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: activeProduct.id,
        color: selectedColor,
        size: selectedSize,
        quantity,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || "Something went wrong");
    }
    window.location.href = data.url;
  } catch (err) {
    errorEl.textContent = err.message || "Couldn't start checkout. Please try again.";
    errorEl.classList.remove("hidden");
    btn.disabled = false;
    updatePrice();
    btn.innerHTML = `Checkout — <span id="modal-price">${formatPrice(
      activeProduct.priceCents * quantity
    )}</span>`;
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

loadCatalog();
