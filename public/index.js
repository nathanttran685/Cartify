/*
 * Nathan Tran
 * index.js adds interactivity to the Cartify grocery page.
 * It allows users to log in, put items in cart and purchase them with returns.
 */

"use strict";

(function() {
  const BASE_URL = "";

  let currentUser = null;
  let cart = [];
  let itemsById = {};

  window.addEventListener("load", init);

  /**
   * Initializes the page by setting up event listeners and loading initial data.
   */
  function init() {
    setupLoginListeners();
    setupSearchListeners();
    setupCartListeners();
    loadAllItems();
  }

  /**
   * Sets up login and signup form listeners.
   */
  function setupLoginListeners() {
    const loginForm = id("login-form");
    const signupForm = id("signup-form");

    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }
    if (signupForm) {
      signupForm.addEventListener("submit", handleSignup);
    }
  }

  /**
   * Sets up search bar and filter listeners.
   */
  function setupSearchListeners() {
    const searchBtn = id("search-btn");
    const searchInput = id("search-input");

    if (searchBtn) {
      searchBtn.addEventListener("click", handleSearch);
    }
    if (searchInput) {
      searchInput.addEventListener("keyup", (evt) => {
        if (evt.key === "Enter") {
          handleSearch();
        }
      });
    }
  }

  /**
   * Sets up cart-related button listeners.
   */
  function setupCartListeners() {
    const checkoutBtn = id("checkout-btn");
    const emptyCartBtn = id("empty-cart");

    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", handleCheckout);
    }
    if (emptyCartBtn) {
      emptyCartBtn.addEventListener("click", emptyCart);
    }
  }

  /**
   * Empties the shopping cart.
   */
  function emptyCart() {
    cart = [];
    renderCart();
  }

  /**
   * Handles user login by sending credentials to the server.
   * @param {Event} evt - The form submit event.
   */
  async function handleLogin(evt) {
    evt.preventDefault();
    const username = id("username").value.trim();
    const password = id("password").value.trim();
    const messageP = id("auth-message");
    if (!username || !password) {
      messageP.textContent = "Please enter both username and password.";
      return;
    }
    try {
      const payload = {username, password};
      const resp = await fetch(BASE_URL + "/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"}, credentials: "include",
        body: JSON.stringify(payload)
      });
      await checkStatus(resp);
      const data = await resp.json();
      currentUser = data.username;
      messageP.textContent = "Logged in as " + currentUser + ". Balance: $" + data.balance;
      if (data.previousTransactions) {
        renderOrders(data.previousTransactions);
      } else {
        loadOrders();
      }
      loadReturns();
    } catch (err) {
      messageP.textContent = "Login failed: " + err;
    }
  }

  /**
   * Handles new user signup by sending account info to the server.
   * @param {Event} evt - The form submit event.
   */
  async function handleSignup(evt) {
    evt.preventDefault();
    const messageP = id("auth-message");

    const credentials = getSignupCredentials();
    if (!credentials.username || !credentials.password) {
      messageP.textContent = "Please enter a username and password to create an account.";
      return;
    }

    const balance = parseBalance(credentials.balanceStr, messageP);
    if (balance === null && credentials.balanceStr !== "") {
      return;
    }

    try {
      const body = buildSignupBody(credentials.username, credentials.password, balance);
      const resp = await fetch(BASE_URL + "/user", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
      });
      await checkStatus(resp);
      const data = await resp.json();

      handleSignupSuccess(data, messageP);
    } catch (err) {
      messageP.textContent = "Signup failed: " + err;
    }
  }

  /**
   * Gets signup credentials from form inputs.
   * @returns {Object} Object containing username, password, and balanceStr.
   */
  function getSignupCredentials() {
    return {
      username: id("new-username").value.trim(),
      password: id("new-password").value.trim(),
      balanceStr: id("start-balance").value.trim()
    };
  }

  /**
   * Builds the signup request body.
   * @param {string} username - The username.
   * @param {string} password - The password.
   * @param {number|null} balance - The starting balance.
   * @returns {Object} The request body object.
   */
  function buildSignupBody(username, password, balance) {
    const body = {username, password};
    if (balance !== null) {
      body.balance = balance;
    }
    return body;
  }

  /**
   * Handles successful signup.
   * @param {Object} data - The response data.
   * @param {Element} messageP - The message element.
   */
  function handleSignupSuccess(data, messageP) {
    messageP.textContent = data.message || "Account created successfully.";
    currentUser = data.username;
    clearSignupForm();
    loadOrders();
    loadReturns();
  }

  /**
   * Parses and validates the balance input.
   * @param {string} balanceStr - The balance string to parse.
   * @param {Element} messageP - The element to display error messages.
   * @returns {number|null} The parsed balance or null if invalid.
   */
  function parseBalance(balanceStr, messageP) {
    if (balanceStr === "") {
      return null;
    }
    const balance = Number(balanceStr);
    if (Number.isNaN(balance) || balance < 0) {
      messageP.textContent = "Starting balance must be a non-negative number.";
      return null;
    }
    return balance;
  }

  /**
   * Clears the signup form fields.
   */
  function clearSignupForm() {
    id("new-username").value = "";
    id("new-password").value = "";
    id("start-balance").value = "";
  }

  /**
   * Loads all available items from the server.
   */
  async function loadAllItems() {
    try {
      const resp = await fetch(BASE_URL + "/items");
      await checkStatus(resp);
      const data = await resp.json();
      if (data.items) {
        cacheItems(data.items);
        renderItems(data.items);
      }
    } catch (err) {
      showError("Error loading items: " + err);
    }
  }

  /**
   * Handles search and filter functionality.
   */
  async function handleSearch() {
    const name = id("search-input").value.trim();
    const category = id("filter-category").value;

    if (!name && (!category || category === "all")) {
      loadAllItems();
      return;
    }

    const params = buildSearchParams(name, category);

    try {
      const url = BASE_URL + "/search?" + params.toString();
      const resp = await fetch(url);
      await checkStatus(resp);
      const data = await resp.json();
      if (data.results) {
        cacheItems(data.results);
        renderItems(data.results);
      }
    } catch (err) {
      showError("Search failed: " + err);
    }
  }

  /**
   * Builds URL search parameters for filtering.
   * @param {string} name - The search term.
   * @param {string} category - The category filter.
   * @returns {URLSearchParams} The constructed search parameters.
   */
  function buildSearchParams(name, category) {
    const params = new URLSearchParams();
    if (name) {
      params.append("name", name);
    }
    if (category && category !== "all") {
      params.append("category", category);
    }
    return params;
  }

  /**
   * Caches items by ID for quick lookup.
   * @param {Array} items - Array of item objects.
   */
  function cacheItems(items) {
    itemsById = {};
    for (const item of items) {
      itemsById[item.itemId] = item;
    }
  }

  /**
   * Renders items to the page.
   * @param {Array} items - Array of item objects to display.
   */
  function renderItems(items) {
    const container = id("items");
    container.innerHTML = "";

    if (!items || items.length === 0) {
      container.textContent = "No items match your search.";
      return;
    }

    items.forEach(item => {
      const article = createItemCard(item);
      container.appendChild(article);
    });
  }

  /**
   * Creates an item card element.
   * @param {Object} item - The item data.
   * @returns {Element} The article element for the item.
   */
  function createItemCard(item) {
    const article = document.createElement("article");

    const title = document.createElement("h3");
    title.textContent = item.name;

    const img = document.createElement("img");
    img.classList.add("item-img");
    img.src = item.image || "images/placeholder.png";
    img.alt = item.name;

    const priceP = document.createElement("p");
    priceP.textContent = "Price: $" + item.price;

    const stockP = document.createElement("p");
    stockP.textContent = "In stock: " + item.stock;

    const detailBtn = document.createElement("button");
    detailBtn.textContent = "View Details";
    detailBtn.addEventListener("click", () => showItemDetail(item.itemId));

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add to Cart";
    addBtn.addEventListener("click", () => addToCart(item));

    article.appendChild(title);
    article.appendChild(img);
    article.appendChild(priceP);
    article.appendChild(stockP);
    article.appendChild(detailBtn);
    article.appendChild(addBtn);

    return article;
  }

  /**
   * Shows detailed information for a single item.
   * @param {number} itemId - The ID of the item to display.
   */
  async function showItemDetail(itemId) {
    try {
      const resp = await fetch(BASE_URL + "/items/" + encodeURIComponent(itemId));
      await checkStatus(resp);
      const item = await resp.json();

      const detailSection = id("item-detail");
      detailSection.innerHTML = "";

      populateItemDetail(detailSection, item);
      detailSection.classList.remove("hidden");
    } catch (err) {
      showError("Error loading item detail: " + err);
    }
  }

  /**
   * Populates the item detail section with item information.
   * @param {Element} detailSection - The container element.
   * @param {Object} item - The item data.
   */
  function populateItemDetail(detailSection, item) {
    const elements = createDetailElements(item);

    detailSection.appendChild(elements.title);
    detailSection.appendChild(elements.img);
    detailSection.appendChild(elements.descP);
    detailSection.appendChild(elements.categoryP);
    detailSection.appendChild(elements.priceP);
    detailSection.appendChild(elements.stockP);
    detailSection.appendChild(elements.addBtn);
    detailSection.appendChild(elements.closeBtn);
  }

  /**
   * Creates all elements for the item detail view.
   * @param {Object} item - The item data.
   * @returns {Object} Object containing all created elements.
   */
  function createDetailElements(item) {
    const title = document.createElement("h2");
    title.textContent = item.name;

    const img = document.createElement("img");
    img.classList.add("item-img");
    img.src = item.image || "images/placeholder.png";
    img.alt = item.name;

    const descP = document.createElement("p");
    descP.textContent = item.description || "No description provided.";

    const categoryP = document.createElement("p");
    categoryP.textContent = "Category: " + (item.category || "N/A");

    const priceP = document.createElement("p");
    priceP.textContent = "Price: $" + item.price;

    const stockP = document.createElement("p");
    stockP.textContent = "In stock: " + item.stock;

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add to Cart";
    addBtn.addEventListener("click", () => addToCart(item));

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => {
      id("item-detail").classList.add("hidden");
    });

    return {title, img, descP, categoryP, priceP, stockP, addBtn, closeBtn};
  }

  /**
   * Adds an item to the shopping cart.
   * @param {Object} item - The item to add.
   */
  function addToCart(item) {
    const existing = cart.find(entry => entry.itemId === item.itemId);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        quantity: 1
      });
    }
    renderCart();
  }

  /**
   * Renders the shopping cart.
   */
  function renderCart() {
    const container = id("cart-items");
    container.innerHTML = "";

    if (cart.length === 0) {
      container.textContent = "Your cart is empty.";
      return;
    }

    let total = 0;
    cart.forEach(entry => {
      const row = createCartRow(entry);
      container.appendChild(row);
      total += entry.price * entry.quantity;
    });

    const totalP = document.createElement("p");
    totalP.textContent = "Cart total: $" + total.toFixed(2);
    container.appendChild(totalP);
  }

  /**
   * Creates a cart row element for an item.
   * @param {Object} entry - The cart entry.
   * @returns {Element} The cart row element.
   */
  function createCartRow(entry) {
    const row = document.createElement("div");
    row.classList.add("cart-row");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = entry.name;

    const qtySpan = document.createElement("span");
    qtySpan.textContent = "Qty: " + entry.quantity;

    const lineTotal = entry.price * entry.quantity;
    const totalSpan = document.createElement("span");
    totalSpan.textContent = "$" + lineTotal.toFixed(2);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.addEventListener("click", () => {
      removeFromCart(entry);
    });

    row.appendChild(nameSpan);
    row.appendChild(qtySpan);
    row.appendChild(totalSpan);
    row.appendChild(removeBtn);

    return row;
  }

  /**
   * Removes an item from the cart or decreases quantity.
   * @param {Object} entry - The cart entry to remove/decrease.
   */
  function removeFromCart(entry) {
    if (entry.quantity > 1) {
      entry.quantity -= 1;
    } else {
      cart = cart.filter(cartEntry => cartEntry.itemId !== entry.itemId);
    }
    renderCart();
  }

  /**
   * Handles the checkout process.
   */
  async function handleCheckout() {
    const messageP = id("auth-message");

    if (!validateCheckout(messageP)) {
      return;
    }

    const body = buildCheckoutBody();

    try {
      const resp = await fetch(BASE_URL + "/purchase", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(body)
      });
      await checkStatus(resp);
      const data = await resp.json();

      displayCheckoutSuccess(messageP, data);
      cart = [];
      renderCart();
      loadOrders();
    } catch (err) {
      messageP.textContent = "Checkout failed: " + err;
    }
  }

  /**
   * Validates checkout conditions.
   * @param {Element} messageP - The message element.
   * @returns {boolean} True if checkout is valid.
   */
  function validateCheckout(messageP) {
    if (!currentUser) {
      messageP.textContent = "Please log in or create an account before checking out.";
      return false;
    }
    if (cart.length === 0) {
      messageP.textContent = "Your cart is empty.";
      return false;
    }
    return true;
  }

  /**
   * Builds the checkout request body.
   * @returns {Object} The checkout body.
   */
  function buildCheckoutBody() {
    return {
      username: currentUser,
      items: cart.map(entry => ({
        itemId: entry.itemId,
        quantity: entry.quantity
      }))
    };
  }

  /**
   * Displays checkout success message.
   * @param {Element} messageP - The message element.
   * @param {Object} data - The response data.
   */
  function displayCheckoutSuccess(messageP, data) {
    messageP.textContent = "Purchase successful! Transaction ID: " + data.transactionId +
          " | Total: $" + data.total +
          " | Remaining balance: $" + data.remainingBalance;
  }

  /**
   * Loads the user's order history.
   */
  async function loadOrders() {
    if (!currentUser) {
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append("username", currentUser);
      const resp = await fetch(BASE_URL + "/orders?" + params.toString(), {
        credentials: "include"
      });
      await checkStatus(resp);
      const data = await resp.json();
      renderOrders(data.orders || []);
    } catch (err) {
      showError("Error loading order history: " + err);
    }
  }

  /**
   * Renders the order history.
   * @param {Array} orders - Array of order objects.
   */
  function renderOrders(orders) {
    const container = id("order-history");
    container.innerHTML = "";

    if (!orders || orders.length === 0) {
      container.textContent = "No past orders yet.";
      return;
    }

    orders.forEach(order => {
      const section = createOrderSection(order);
      container.appendChild(section);
    });
  }

  /**
   * Creates an order section element.
   * @param {Object} order - The order data.
   * @returns {Element} The order section element.
   */
  function createOrderSection(order) {
    const section = document.createElement("section");
    section.classList.add("order");

    const heading = document.createElement("h3");
    heading.textContent = "Order #" + order.transactionId;

    const dateP = document.createElement("p");
    dateP.textContent = "Date: " + order.date;

    const totalP = document.createElement("p");
    totalP.textContent = "Total: $" + order.total;

    const returnBtn = document.createElement("button");
    returnBtn.textContent = "Return Order";
    returnBtn.addEventListener("click", () => handleReturn(order.transactionId));

    section.appendChild(heading);
    section.appendChild(dateP);
    section.appendChild(totalP);

    if (order.items && order.items.length > 0) {
      const list = createOrderItemsList(order.items);
      section.appendChild(list);
    }

    section.appendChild(returnBtn);
    return section;
  }

  /**
   * Creates a list of order items.
   * @param {Array} items - Array of item objects.
   * @returns {Element} The ul element with items.
   */
  function createOrderItemsList(items) {
    const list = document.createElement("ul");
    items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.quantity + "x " + item.name +
                       " ($" + item.pricePerUnit + " each)";
      list.appendChild(li);
    });
    return list;
  }

  /**
   * Handles returning an order.
   * @param {number} transactionId - The ID of the transaction to return.
   */
  async function handleReturn(transactionId) {
    const messageP = id("auth-message");

    if (!currentUser) {
      messageP.textContent = "Please log in to return an order.";
      return;
    }

    messageP.textContent = "Click 'Return Order' again to confirm return for Order #" +
                           transactionId;

    try {
      const body = {
        username: currentUser,
        transactionId: transactionId
      };

      const resp = await fetch(BASE_URL + "/return", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(body)
      });
      await checkStatus(resp);
      const data = await resp.json();

      displayReturnSuccess(messageP, data);

      loadOrders();
      loadReturns();
    } catch (err) {
      messageP.textContent = "Return failed: " + err;
    }
  }

  /**
   * Displays return success message.
   * @param {Element} messageP - The message element.
   * @param {Object} data - The response data.
   */
  function displayReturnSuccess(messageP, data) {
    messageP.textContent = "Return successful! Return ID: " + data.returnId +
          " | Refund: $" + data.refundTotal +
          " | New balance: $" + data.newBalance;
  }

  /**
   * Loads the user's return history.
   */
  async function loadReturns() {
    if (!currentUser) {
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append("username", currentUser);
      const resp = await fetch(BASE_URL + "/returns?" + params.toString());
      await checkStatus(resp);
      const data = await resp.json();
      renderReturns(data.returns || []);
    } catch (err) {
      showError("Error loading returns: " + err);
    }
  }

  /**
   * Renders the returns history.
   * @param {Array} returns - Array of return objects.
   */
  function renderReturns(returns) {
    const container = id("returns-history");
    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (!returns || returns.length === 0) {
      container.textContent = "No returns yet.";
      return;
    }

    returns.forEach(ret => {
      const section = createReturnSection(ret);
      container.appendChild(section);
    });
  }

  /**
   * Creates a return section element.
   * @param {Object} ret - The return data.
   * @returns {Element} The return section element.
   */
  function createReturnSection(ret) {
    const section = document.createElement("section");
    section.classList.add("return-item");

    const heading = document.createElement("h3");
    heading.textContent = "Return #" + ret.returnId;

    const transP = document.createElement("p");
    transP.textContent = "Original Order: #" + ret.transactionId;

    const dateP = document.createElement("p");
    dateP.textContent = "Date: " + ret.date;

    const refundP = document.createElement("p");
    refundP.textContent = "Refund: $" + ret.refundTotal;

    const balanceP = document.createElement("p");
    balanceP.textContent = "Balance after return: $" + ret.newBalance;

    section.appendChild(heading);
    section.appendChild(transP);
    section.appendChild(dateP);
    section.appendChild(refundP);
    section.appendChild(balanceP);

    return section;
  }

  /**
   * Checks the response status and throws an error if not ok.
   * @param {Response} resp - The fetch response object.
   */
  async function checkStatus(resp) {
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || resp.status);
    }
  }

  /**
   * Displays an error message to the user.
   * @param {string} message - The error message to display.
   */
  function showError(message) {
    const messageP = id("auth-message");
    if (messageP) {
      messageP.textContent = message;
    }
  }

  /**
   * Gets an element by ID.
   * @param {string} idName - The ID of the element.
   * @returns {Element} The DOM element.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

})();