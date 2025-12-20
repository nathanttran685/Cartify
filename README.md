Cartify 🛒

An Online Grocery Store Web Application

Cartify is a full-stack online grocery store that allows users to browse items, search and filter products, manage a shopping cart, place purchases, and process returns. The application emphasizes clean design, correctness, and reliable data handling across the frontend and backend.

🚀 Features

User authentication (login & account creation)

Browse all grocery items with images, prices, and stock

Search items by name and filter by category

Detailed item view pages

Shopping cart with quantity management

Checkout with balance validation

Order history tracking

Full return/refund system with inventory restocking

Persistent session handling

🛠️ Tech Stack
Frontend

HTML5, CSS3

Vanilla JavaScript (DOM manipulation, async/await)

Dynamic rendering of items, cart, orders, and returns

Backend

Node.js + Express

RESTful API design

Session-based authentication (express-session)

SQLite database for persistence

Database

SQLite

Structured relational schema:

Users

Items

Transactions

Transaction_Items

Returns

Parameterized queries to prevent SQL injection

📂 Project Structure
/public
  ├── index.html
  ├── styles.css
  ├── index.js
  └── images/
server.js
cartify.db

🔌 API Endpoints
Method	Endpoint	Description
GET	/items	Retrieve all grocery items
GET	/items/:id	Retrieve a single item
GET	/search	Search/filter items
POST	/login	User login
POST	/user	Create new account
POST	/purchase	Process checkout
GET	/orders	Retrieve order history
POST	/return	Return an order
GET	/returns	Retrieve return history
⚙️ How to Run Locally

Clone the repository

git clone https://github.com/your-username/cartify.git
cd cartify


Install dependencies

npm install


Start the server

node server.js


Open in browser

http://localhost:8000

🧠 Design Highlights

Separation of concerns between frontend and backend

Session-based authentication for protected actions

Transactional integrity for purchases and returns

Inventory consistency maintained across purchases and refunds

Scalable search logic using dynamic SQL query construction

📸 Assets & Credits

Logo: AI-generated using OpenAI

Item images: iStock, Shutterstock, Pngtree

👥 Authors

Nathan Tran

Aryan Goel

Built as a course project to demonstrate full-stack development, database design, and API engineering.
