# *Cartify API Documentation*
*API for an online grocery store supporting item browsing, login, searching, purchasing (single or bulk), viewing order history, and making returns.*

---

## *Get All Items*
**Request Format:** */items*
**Request Type:** *GET*
**Returned Data Format:** JSON

**Description:**
*Returns all grocery items available in the store. Used for the main “Available Groceries” view.*

**Example Request:** *GET /items*

**Example Response:**
*{
  "items": [
    {
      "itemId": 1,
      "name": "Apples",
      "category": "fruits",
      "price": 2,
      "stock": 30,
      "image": "images/apple.jpg",
      "description": "Crisp, sweet apples."
    },
    {
      "itemId": 2,
      "name": "Bananas",
      "category": "fruits",
      "price": 1,
      "stock": 20,
      "image": "images/banana.jpg",
      "description": "Yellow, ripe bannans."
    }
    ...
  ]
}*

**Error Handling:**
*500: Server error*

---

## *Get Item Details*
**Request Format:** */items/{itemId}*
**Request Type:** *GET*
**Returned Data Format:** JSON

**Description:**
*Returns detailed information for a single grocery item, including full description, stock, tags, and rating summary.*

**Example Request:** *GET /items/1*

**Example Response:**
*{
  "itemId": 1,
  "name": "Apples",
  "category": "fruits",
  "price": 2,
  "stock": 30,
  "image": "images/apple.jpg",
  "description": "Crisp, sweet apples."
}*
**Error Handling:**
*
  404: Item not found
  500: Server error
*

---

## *Search Items*
**Request Format:** */search?name={text}&category={cat}*
**Request Type:** *GET*
**Returned Data Format:** JSON

**Description:**
*Searches grocery items by name/description and optional category.*

**Example Request:** *GET /search?category=fruits*

**Example Response:**
*{
  "results": [
    {
      "itemId": 1,
      "name": "Apples",
      "category": "fruits",
      "price": 2,
      "stock": 30,
      "image": "images/apple.jpg",
      "description": "Crisp, sweet apples."
    },
    {
      "itemId": 2,
      "name": "Bananas",
      "category": "fruits",
      "price": 1,
      "stock": 20,
      "image": "images/banana.jpg",
      "description": "Yellow, ripe bannans."
    }
  ]
}*

**Error Handling:**
*
  404: Item not found
  500: Server error
*

---

## *Login User*
**Request Format:** */login*
**Request Type:** *POST*
**Returned Data Format:** JSON

**Description:**
*Checks whether a username/password pair is valid. On success, returns the username and profile information including balance. The front end stores the username for authenticated actions. It is returned in order of most recent*

**Example Request:** *POST /login*

with body being
{
  "user": "user1"
  "password": "pass"
}

**Example Response:**
*{
  "username": "user1",
  "message": "Login successful.",
  "balance": 100
  "previousTransactions": [
    {
      "transactionId": 12,
      "date": "2025-01-15T14:32:00Z",
      "total": 7,
      "items": [
        { "itemId": 1, "name": "Apples", "quantity": 3, "pricePerUnit": 2, "itemTotal": 6 },
        { "itemId": 2, "name": "Bananas", "quantity": 1, "pricePerUnit": 1, "itemTotal": 1 }
      ]
    },
    {
      "transactionId": 9,
      "date": "2016-04-27 15:22:14",
      "total": 5,
      "items": [
        { "itemId": 2, "name": "Bananas", "quantity": 5, "pricePerUnit": 1, "itemTotal": 5 }
      ]
    }
  ]
}*

**Error Handling:**
*
  400: Missing information
  404: Invalid credentials
  500: Server error
*

---

## *Create User*
**Request Format:** */user*
**Request Type:** *POST*
**Returned Data Format:** JSON

**Description:**
*Creates a new user account with a username, password, email, starting balance (optional), and profile fields. Fails if the username is already taken or required info is missing*

**Example Request:** *POST /user*

with body being
{
  "username": "user1",
  "password": "pass123",
  "email": "test@gmail.com",
  "balance": 100
}

**Example Response:**
*{
  "username": "user1",
  "message": "Account successfully created.",
  "balance": 100,
}*

**Error Handling:**
*
  400: Missing information
  404: Invalid username
  500: Server error
*

---

## *Submit Purchase*
**Request Format:** */purchase*
**Request Type:** *POST*
**Returned Data Format:** JSON

**Description:**
*Submits a purchase for one or more grocery items. Used for cart purchases. It will update the users
balance and can only be done if user is logged in. Generates a code too*

**Example Request:** *POST /purchase*

with body being
{
  "username": user1
  "items": [
    { "itemId": 1, "quantity": 2 },
    { "itemId": 3, "quantity": 3 }
  ]
}

**Example Response:**
*{
  "transactionId": 1,
  "confirmationCode": AKQJIEOAISJDFIOAISJF,
  "date": "2016-04-27 15:22:15",
  "total": 10,
  "remainingBalance": 20,
  "items": [
    {
      "itemId": 1,
      "name": "Apples",
      "quantity": 2,
      "pricePerUnit": 2,
      "itemTotal": 4
    }
    {
      "itemId": 3,
      "name": "Carrots",
      "quantity": 3,
      "pricePerUnit": 2,
      "itemTotal": 6
    }
  ]
}*

**Error Handling:**
*
  400: Item not found or no stock
  400: Not enough funds
  400: Missing information
  401: Not logged in
  500: Server error
*

---

## *Get Order History*
**Request Format:** */orders?username={u}*
**Request Type:** *GET*
**Returned Data Format:** JSON

**Description:**
*Returns all past grocery orders for a logged-in user*

**Example Request:** *GET /orders?username=user1*

**Example Response:**
*{
  "username": "user1",
  "orders": [
    {
      "transactionId": 12,
      "confirmationCode": AKQJIEOAISJDFIOAISJF,
      "date": "2017-04-27 15:22:14",
      "total": 7,
      "items": [
        { "itemId": 1, "name": "Apples", "quantity": 3, "pricePerUnit": 2, "itemTotal": 6 },
        { "itemId": 2, "name": "Bananas", "quantity": 1, "pricePerUnit": 1, "itemTotal": 1 }
      ]
    },
    {
      "transactionId": 9,
      "confirmationCode": WWRJIEOAISJE90OAISJ1,
      "date": "2017-05-27 15:22:14",
      "total": 5,
      "items": [
        { "itemId": 2, "name": "Bananas", "quantity": 5, "pricePerUnit": 1, "itemTotal": 5 }
      ]
    }
  ]
}*

**Error Handling:**

*
  400: Missing information
  404: Invalid username
  500: Server error
*

---

## *Return Order*
**Request Format:** */return*
**Request Type:** *POST*
**Returned Data Format:** JSON

**Description:**
*Allows a logged-in user to return a whole purchase*

**Example Request:** *POST /return*

with a body

{
  "username": "user1",
  "transactionId": 1
}

**Example Response:**
*{
  "returnId": 5,
  "username": "user1",
  "transactionId": 12,
  "date": "2016-04-27 15:22:14",
  "refundTotal": 3
  "newBalance": 103
}*

**Error Handling:**

*
  400: Missing information
  404: Invalid credentials
  404: Invalid transaction
  500: Server error
*

---

## *Get Returns*
**Request Format:** */returns?username={u}*
**Request Type:** *GET*
**Returned Data Format:** JSON

**Description:**
*Returns all past return records for a specified user. Each return includes the return ID, the original transaction ID, the date of return, the refund amount, and the user's updated balance after the return.*

**Example Request:** *GET /returns?username=user1*

**Example Response:**
*{
  "username": "user1",
  "returns": [
    {
      "returnId": 5,
      "transactionId": 12,
      "date": "2016-04-27 15:22:14",
      "refundTotal": 3,
      "newBalance": 103
    },
    {
      "returnId": 3,
      "transactionId": 9,
      "date": "2016-03-12 10:11:54",
      "refundTotal": 5,
      "newBalance": 120
    }
  ]
}*

**Error Handling:**

*
  400: Missing information
  404: Invalid Credentials
  500: Server error
*

