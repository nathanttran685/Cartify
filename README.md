# Cartify 🛒  
**An Online Grocery Store Web Application**

Cartify is a full-stack online grocery store that allows users to browse items, search and filter products, manage a shopping cart, place purchases, and process returns. The application emphasizes clean design, correctness, and reliable data handling across the frontend and backend.

---

## 🚀 Features

- User authentication (login & account creation)
- Browse grocery items with images, prices, and stock
- Search items by name and filter by category
- Detailed item view pages
- Shopping cart with quantity management
- Checkout with balance validation
- Order history tracking
- Return/refund system with inventory restocking
- Persistent session handling

---

## 🛠️ Tech Stack

### Frontend
- HTML5, CSS3
- JavaScript (DOM manipulation, async/await)
- Dynamic rendering for items, cart, orders, and returns

### Backend
- Node.js + Express
- RESTful API architecture
- Session-based authentication (`express-session`)
- SQLite database for persistence

### Database
- SQLite
- Relational schema:
  - Users
  - Items
  - Transactions
  - Transaction_Items
  - Returns
- Parameterized SQL queries to prevent injection attacks

---

## 📂 Project Structure

public/
├── index.html
├── styles.css
├── index.js
└── images/
server.js
cartify.db


---

## 🔌 API Endpoints

| Method | Endpoint        | Description |
|------|----------------|-------------|
| GET  | `/items`        | Retrieve all grocery items |
| GET  | `/items/:id`    | Retrieve a single item |
| GET  | `/search`       | Search and filter items |
| POST | `/login`        | User login |
| POST | `/user`         | Create new user account |
| POST | `/purchase`     | Process checkout |
| GET  | `/orders`       | Retrieve order history |
| POST | `/return`       | Return an order |
| GET  | `/returns`      | Retrieve return history |

---

## ⚙️ Running the Project Locally

```bash
https://github.com/nathanttran685/Cartify.git
cd Cartify
npm install
nodemon
```
On browser open http://localhost:8000


## Author
Nathan Tran


