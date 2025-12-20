/*
 * Nathan Tran
 * This file implements the Node.js/Express backend for the Cartify application.
 * It helps manage data for the Cartify online store including items, transactions,
 * and also users logins
 */

"use strict";

const ERROR_INTERNAL = 500;
const ERROR_USER = 400;
const ERROR_LOGIN = 401;
const ERROR_INVALID = 404;
const DEFAULT_PORT = 8000;
const STARTING_BALANCE = 10;
const CODE_LENGTH = 8;
const DATE_FORMAT = 10;

const express = require("express");
const multer = require("multer");
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({extended: true})); // built-in middleware
app.use(express.json()); // built-in middleware
app.use(multer().none()); // requires the "multer" module

const session = require("express-session");
app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false,
  cookie: {secure: false}
}));

/**
 * GET /items
 * Thsi retrieves all availible grocery items from the database
 * @retuns {Promise<Object>} a json object wiht an array of all items with additional info
 */
app.get("/items", async (req, res) => {
  try {
    const db = await getDBConnection();
    let allItems = await db.all("SELECT * FROM Items");
    let items = [];

    for (const item of allItems) {
      items.push({
        itemId: item.item_id,
        name: item.item_name,
        category: item.category,
        price: item.price,
        stock: item.stock,
        image: item.item_image,
        description: item.item_description
      });
    }

    res.json({items});
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * GET /items/:itemId
 * Gets the single grocery item with ID.
 * @param {String} itemId - The ID of the item we want to get.
 * @returns {Promise<Object>} JSON object containing the item details or an error if not found.
 */
app.get("/items/:itemId", async (req, res) => {
  try {
    const db = await getDBConnection();
    const item = await db.get("SELECT * FROM Items WHERE item_id = ?", req.params.itemId);

    if (!item) {
      return res.status(ERROR_INVALID).json({error: "Item not found"});
    }

    res.json({
      itemId: item.item_id,
      name: item.item_name,
      category: item.category,
      price: item.price,
      stock: item.stock,
      image: item.item_image,
      description: item.item_description
    });
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * GET /search
 * Searches for items by name and or category.
 * @param {String} name - This is the name of the item or whatever is entered in search. OPTIONAL
 * @param {String} category - This is the category we are looking at. OPTIONAL
 * @returns {Promise<Object>} This returns the json object with matching items or error if
 * not found
 */
app.get("/search", async (req, res) => {
  try {
    const db = await getDBConnection();
    const {name, category} = req.query;
    const {sql, params} = buildSearchQuery(name, category);
    const items = await db.all(sql, params);
    if (!items.length) {
      return res.status(ERROR_INVALID).json({error: "Item not found"});
    }
    res.json({results: items.map(i => ({
      itemId: i.item_id, name: i.item_name, category: i.category,
      price: i.price, stock: i.stock, image: i.item_image, description: i.item_description
    }))});
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * This function creates a sql query and parameters to search for an object given a search
 * and category filter.
 * @param {String} name This is the search word entered that we are making the search query for
 * @param {String} category THis is the category for the search
 * @returns {{sql: String, params: String[]}} this is the constructed sql query and the parameters
 * to insert
 */
function buildSearchQuery(name, category) {
  let sql = "SELECT * FROM Items";
  const params = [];
  const conditions = [];
  if (name) {
    conditions.push("(item_name LIKE ? OR item_description LIKE ?)");
    params.push(`%${name}%`, `%${name}%`);
  }
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (conditions.length) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  return {sql, params};
}

/**
 * POST /login
 * This function logs in a user
 * @param {String} username - Username of the user from body
 * @param {String} password - Password of the user from body
 * @returns {Promise<Object>} JSON object with login success message and user info
 */
app.post("/login", async (req, res) => {
  try {
    const {username, password} = req.body;
    if (!username || !password) {
      return res.status(ERROR_USER).json({error: "Missing information"});
    }
    const db = await getDBConnection();
    let user =
        await db.get("SELECT * FROM Users WHERE username = ? AND pass = ?", username, password);
    if (!user) {
      return res.status(ERROR_INVALID).json({error: "Invalid credentials"});
    }
    const transactions =
        await db.all("SELECT * FROM Transactions WHERE username = ? ORDER BY tdate DESC", username);
    for (let trans of transactions) {
      trans.items = await getTransactionItems(db, trans.transaction_id);
    }
    req.session.user = {username};
    res.json({
      username: user.username, message: "Login successful.", balance: user.balance,
      previousTransactions: transactions.map(trans => ({
        transactionId: trans.transaction_id,
        date: trans.tdate, total: trans.total, items: trans.items
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * This function grabs all of the items for a given transaction and formats it in the API response
 * @param {object} db - SQLite connection object.
 * @param {int} tid This is the id of the transaction
 * @returns {Array} This is the array of items inside of the transaction and other information
 */
async function getTransactionItems(db, tid) {
  const items = await db.all(
    `SELECT ti.item_id, i.item_name, ti.quantity, ti.price_per_unit, ti.item_total
     FROM Transaction_Items ti
     JOIN Items i ON ti.item_id = i.item_id
     WHERE ti.transaction_id = ?`,
     tid
  );

  const result = [];
  for (const item of items) {
    result.push({
      itemId: item.item_id,
      name: item.item_name,
      quantity: item.quantity,
      pricePerUnit: item.price_per_unit,
      itemTotal: item.item_total
    });
  }
  return result;
}

/**
 * POST /user
 * Creates a new user account with optional starting balance.
 * @param {String} username - The username from body
 * @param {String} password - password for the account which is from body
 * @param {String} email - The email of the user
 * @param {Number} [balance] - Optional starting balance from body
 * @returns {Promise<Object>} This is the json object confirming the account
 */
app.post("/user", async (req, res) => {
  try {
    const {username, password, email, balance} = req.body;

    if (!username || !password || !email) {
      return res.status(ERROR_USER).json({error: "Missing information"});
    }
    const db = await getDBConnection();
    const alreadyExists = await db.get("SELECT * FROM Users WHERE username = ?", username);
    if (alreadyExists) {
      return res.status(ERROR_INVALID).json({error: "Invalid username"});
    }
    const startingBalance = ((balance) ? balance : STARTING_BALANCE);
    await db.run(
      "INSERT INTO Users (username, pass, email, balance) VALUES (?, ?,?, ?)",
      username,
      password,
      email,
      startingBalance
    );
    res.json({
      username: username,
      message: "Account successfully created.",
      balance: startingBalance
    });
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * POST /purchase
 * Processes a purchase by validating items in the cart, checking user that is logged in balance,
 * then making the purchase by changing inventory and balances
 * @param {String} username - Username of the person purchasing from body.
 * @param {Array<Object>} items - Array of items with id and quantity which is from body
 * @returns {Promise<Object>} JSON object containing transaction summary
 */
app.post("/purchase", async (req, res) => {
  try {
    const {username, items} = req.body;
    if (!username || !items || !items.length) {
      return res.status(ERROR_USER).json({error: "Missing information"});
    }
    const db = await getDBConnection();
    if (!req.session.user || req.session.user.username !== username) {
      return res.status(ERROR_LOGIN).json({error: "Not logged in"});
    }
    const user = await db.get("SELECT * FROM Users WHERE username = ?", username);
    const cart = await buildCart(db, items);
    if (cart.error) {
      return res.status(ERROR_USER).json({error: cart.error});
    }
    let total = 0;
    for (const item of cart) {
      total += item.price * item.quantity;
    }
    if (user.balance < total) {
      return res.status(ERROR_USER).json({error: "Not enough funds"});
    }
    const result = await finalizePurchase(db, username, user, cart, total);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * This function validates item requests and makes sure it exists. It then builts the cart with
 * items and info
 * @param {object} db - SQLite connection object.
 * @param {Array<Integer,Integer>} items THis is the purchase request
 * @returns {Promise<Array>} This is the cart array with the items info
 * may also return an object with an error field in case of an error
 */
async function buildCart(db, items) {
  const cart = [];

  for (const it of items) {
    const info = await db.get("SELECT * FROM Items WHERE item_id = ?", it.itemId);
    if (!info || info.stock < it.quantity) {
      return {error: "Item not found or no stock"};
    }

    cart.push({
      id: info.item_id,
      name: info.item_name,
      price: info.price,
      quantity: it.quantity,
      stock: info.stock
    });
  }
  return cart;
}

/**
 * This function finalizes the purchase by creating a transaction record, deducting inventory
 * charging to the user, and returning the purchase info
 * @param {Object} db - SQLite connection object
 * @param {String} username This is the username of the user purchasing
 * @param {Object} user This information on the user
 * @param {Array} cart This is the cart items to purcahse
 * @param {Int} total The cost
 * @returns {Promise<object>} The transaction summary
 */
async function finalizePurchase(db, username, user, cart, total) {
  const {transactionId, confirmationCode} = await addTransaction(db, username, total);

  for (const item of cart) {
    await addTransactionItem(db, transactionId, item);
    await db.run(
      "UPDATE Items SET stock = ? WHERE item_id = ?",
      item.stock - item.quantity,
      item.id
    );
  }
  await db.run("UPDATE Users SET balance = ? WHERE username = ?", user.balance - total, username);
  return {
    transactionId: transactionId,
    confirmationCode: confirmationCode,
    date: new Date().toISOString()
      .slice(0, DATE_FORMAT)
      .replace(/-/g, ""),
    total,
    remainingBalance: user.balance - total,
    items: cart.map(i => ({
      itemId: i.id,
      name: i.name,
      quantity: i.quantity,
      pricePerUnit: i.price,
      itemTotal: i.quantity * i.price
    }))
  };
}

/**
 * This function makes part of the confirmation code and returns it.
 * @returns {String} returns a randomly generated code of 8 characters.
 */
function generateRandom() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomPart;
}

/**
 * This function adds a single purchased item into the transaction items table
 * @param {object} db - SQLite connection object.
 * @param {int} tid The id of the transaction
 * @param {Object} item The item being purchased
 * @returns {Promise} This is a promis that resolves when the insert is complete
 */
async function addTransactionItem(db, tid, item) {
  await db.run(
    "INSERT INTO Transaction_Items (transaction_id, item_id, " +
    "quantity, price_per_unit, item_total) VALUES (?, ?, ?, ?, ?)",
    tid,
    item.id,
    item.quantity,
    item.price,
    item.price * item.quantity
  );
}

/**
 * THis inserts a new transaction of a user into the transactions table and returns a new id
 * @param {object} db - SQLite connection object.
 * @param {String} username THis is the username of the user buying
 * @param {int} total the total cost of the transaction
 * @param {int} cc the confirmation code
 * @returns {Promise<object>}This is an object with the new transaction ID
 */
async function addTransaction(db, username, total) {
  await db.run(
    "INSERT INTO Transactions (username, total) VALUES (?, ?)",
    username,
    total
  );
  const row = await db.get("SELECT last_insert_rowid() AS id");
  const transactionId = row.id;
  const date = new Date().toISOString()
    .slice(0, DATE_FORMAT)
    .replace(/-/g, "");
  const random = generateRandom();
  const confirmationCode = `${date}-${transactionId}-${random}`;
  await db.run(
    "UPDATE Transactions SET confirmation_code = ? WHERE transaction_id = ?",
    confirmationCode,
    transactionId
  );

  return {transactionId, confirmationCode};
}

/**
 * GET /orders
 * Gets all orders from a given user that is logged in
 * @param {String} username - Username of the user from query
 * @returns {Promise<Object>} JSON object with a list of the user's orders
 */
app.get("/orders", async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(ERROR_USER).json({error: "Missing information"});
    }
    const db = await getDBConnection();
    if (!req.session.user || req.session.user.username !== username) {
      return res.status(ERROR_LOGIN).json({error: "Not logged in"});
    }
    const transactions = await db.all(
      "SELECT transaction_id, confirmation_code AS confirmationCode, tdate AS date, total " +
      "FROM Transactions WHERE username = ? ORDER BY transaction_id DESC",
      username
    );
    const orders = [];
    for (let tran of transactions) {
      const items = await getTransactionItems(db, tran.transaction_id);
      orders.push({
        transactionId: tran.transaction_id, confirmationCode: tran.confirmationCode,
        date: tran.date, total: tran.total, items
      });
    }
    res.json({username, orders});
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * POST /return
 * This function makes a return given a user that is logged in and the transaction they want
 * to return
 * @param {String} username - Username of the user requesting the return which is from body
 * @param {Number} transactionId - Transaction ID to be returned from body
 * @returns {Promise<Object>} JSON object with return summary
 */
app.post("/return", async (req, res) => {
  try {
    const {username, transactionId} = req.body;
    if (!username || !transactionId) {
      return res.status(ERROR_USER).json({error: "Missing information"});
    }
    const db = await getDBConnection();
    if (!req.session.user || req.session.user.username !== username) {
      return res.status(ERROR_LOGIN).json({error: "Not logged in"});
    }
    const user = await db.get("SELECT * FROM Users WHERE username = ?", username);
    const transaction = await db.get(
      "SELECT * FROM Transactions WHERE transaction_id = ? AND username = ?",
      transactionId,
      username
    );
    if (!transaction) {
      return res.status(ERROR_INVALID).json({error: "Invalid transaction"});
    }
    const retrn = await processReturn(db, transaction, user);
    res.json(retrn);
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * This function makes a return for the given transaction by restocking the item, refunding to user
 * and recording the return.
 * @param {Object} db the SQLite connection object
 * @param {Object} transaction This is the transaction being returned
 * @param {Object} user This is the user who made the return
 * @returns {Promise<Object>} This is an object with the retun information
 */
async function processReturn(db, transaction, user) {
  const items = await db.all(
    "SELECT * FROM Transaction_Items WHERE transaction_id = ?",
    transaction.transaction_id
  );
  for (const item of items) {
    const current = await db.get("SELECT stock FROM Items WHERE item_id = ?", item.item_id);
    await db.run(
      "UPDATE Items SET stock = ? WHERE item_id = ?",
      current.stock + item.quantity,
      item.item_id
    );
  }
  const newBalance = user.balance + transaction.total;
  await db.run("UPDATE Users SET balance = ? WHERE username = ?", newBalance, user.username);
  await db.run(
    "INSERT INTO Returns (transaction_id, username, refund_total) VALUES (?, ?, ?)",
    transaction.transaction_id,
    user.username,
    transaction.total
  );
  const ret = await db.get("SELECT last_insert_rowid() AS id");
  return {
    returnId: ret.id,
    username: user.username,
    transactionId: transaction.transaction_id,
    date: new Date(),
    refundTotal: transaction.total, newBalance
  };
}

/**
 * GET /returns
 * gets all returns processed for a given user that is logged in
 * @param {String} username - Username of the user which is from query
 * @returns {Promise<Object>} JSON object with a list of returns with additional info
 */
app.get("/returns", async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(ERROR_USER).json({error: "Missing information"});
    }

    const db = await getDBConnection();
    if (!req.session.user || req.session.user.username !== username) {
      return res.status(ERROR_LOGIN).json({error: "Not logged in"});
    }
    const returns =
        await db.all("SELECT * FROM Returns WHERE username = ? ORDER BY return_id DESC", username);
    const formatted = returns.map(retrn => ({
      returnId: retrn.return_id,
      transactionId: retrn.transaction_id,
      date: retrn.date,
      refundTotal: retrn.refund_total,
      newBalance: retrn.new_balance
    }));
    res.json({username, returns: formatted});
  } catch (err) {
    console.error(err);
    res.status(ERROR_INTERNAL).json({error: "Server error"});
  }
});

/**
 * Establishes a database connection to a database and returns the database object.
 * Any errors that occur during connection should be caught in the function
 * that calls this one.
 * @returns {Object} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: 'cartify.db',
    driver: sqlite3.Database
  });
  return db;
}

const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);