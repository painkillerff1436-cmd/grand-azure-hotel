# 🏨 Grand Azure Hotel & Resort — Backend & MySQL Integration

Full-stack luxury hotel reservation and resort management platform powered by **Node.js, Express, and MySQL (managed via MySQL Workbench)**.

---

## 📁 System Architecture

```text
d:/mini project A/
├── server.js                      # Express application entry point (port 3001)
├── package.json                   # Dependencies (express, mysql2, cors, bcryptjs, jsonwebtoken, etc.)
├── database.sql                   # Complete MySQL schema & initial seed data
├── .env                           # Local environment configuration
├── .env.example                   # Environment variable template
│
├── config/
│   └── db.js                      # MySQL2 connection pool with keep-alive
│
├── middleware/
│   ├── authMiddleware.js          # JWT verification & Admin role authorization
│   ├── validationMiddleware.js    # Data sanitization & input validators
│   └── errorHandler.js            # Centralized API error handling
│
├── controllers/
│   ├── authController.js          # Admin login with bcrypt verification & JWT issuance
│   ├── roomController.js          # Room catalog & real-time conflict-free availability
│   ├── reservationController.js   # Booking engine with server-side pricing & overlap prevention
│   ├── foodController.js          # In-room dining orders with MySQL transactions
│   ├── contactController.js       # Customer inquiry submissions & spam protection
│   └── adminController.js         # Comprehensive admin management (bookings, dining, contacts, admins)
│
├── routes/
│   ├── roomRoutes.js              # /api/rooms & /api/rooms/availability
│   ├── reservationRoutes.js       # /api/reservations (with multipart file uploads)
│   ├── foodRoutes.js              # /api/menu & /api/orders
│   ├── contactRoutes.js           # /api/contact & /api/contacts
│   └── adminRoutes.js             # /api/admin/* (JWT-protected dashboard routes)
│
├── js/
│   ├── api.js                     # Frontend API SDK connector for all pages
│   └── main.js                    # UI interactions, navigation, and modal logic
│
├── uploads/                       # Storage for guest ID documents and contact attachments
│
├── index.html                     # Homepage with live MySQL room availability search
├── reservation.html               # Real-time room booking with server-side price calculation
├── food.html                      # In-room dining menu & real-time order status tracking
├── contact.html                   # Guest inquiry form with instant submission feedback
└── admin.html                     # Administrator portal (reservations, food orders, members, admins)
```

---

## 🗄️ Step 1: Database Setup in MySQL Workbench

1. Launch **MySQL Workbench** and connect to your local MySQL instance (e.g., `Local instance MySQL80`).
2. Click **File** ➔ **Open SQL Script...** (or press `Ctrl + Shift + O`).
3. Select `database.sql` located in this directory (`d:\mini project A\database.sql`).
4. Click the **Execute (⚡ Lightning bolt icon)** button to execute the entire script.
5. In the **SCHEMAS** panel on the left, click **Refresh (🔄)**. You will see `grand_azure_hotel` populated with:
   - `users` (includes seeded Super Admin and loyalty members)
   - `rooms` (luxury rooms with real nightly rates: Deluxe, Executive, Penthouse, etc.)
   - `reservations` (booking records with conflict prevention)
   - `food_menu` (gourmet dining catalog with prices & categories)
   - `food_orders` (kitchen orders with room delivery details)
   - `food_order_items` (order breakdown by dish and quantity)
   - `contact_messages` (concierge and VIP inquiries)

---

## ⚙️ Step 2: Configure Environment Variables

Open the `.env` file in the project root:

```ini
PORT=3001
NODE_ENV=development

# MySQL Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_ROOT_PASSWORD
DB_NAME=grand_azure_hotel

# JWT Authentication
JWT_SECRET=grand_azure_super_secret_jwt_key_2026_secured!
JWT_EXPIRES_IN=24h
```

> **Note:** Replace `YOUR_MYSQL_ROOT_PASSWORD` with the password you use when logging into MySQL Workbench.

---

## 🚀 Step 3: Run the Backend Server

Open your terminal in `d:\mini project A\` and run:

```bash
# Start the Express API server
npm start
```

Or for development with automatic reload on changes:

```bash
npm run dev
```

You will see:
```text
====================================================
🏨 Grand Azure Hotel & Resort API Server
🌐 Server running at: http://localhost:3001
📡 Health Check URL:  http://localhost:3001/api/health
====================================================
✅ [MySQL] Successfully connected to database: "grand_azure_hotel" on localhost:3306
```

---

## 🌐 Step 4: Access the Frontend Website

The Express backend automatically serves the frontend website directly:

- **Home & Availability Search:** [http://localhost:3001/index.html](http://localhost:3001/index.html)
- **Room Reservations:** [http://localhost:3001/reservation.html](http://localhost:3001/reservation.html)
- **In-Room Dining & Tracking:** [http://localhost:3001/food.html](http://localhost:3001/food.html)
- **Concierge Inquiries:** [http://localhost:3001/contact.html](http://localhost:3001/contact.html)
- **Admin Portal Dashboard:** [http://localhost:3001/admin.html](http://localhost:3001/admin.html)

*(You can also use VS Code Live Server if you prefer; `js/api.js` automatically communicates with `http://localhost:3001/api` across origins via CORS).*

---

## 🔐 Default Administrator Login

| Field | Credential |
| :--- | :--- |
| **Portal** | [admin.html](http://localhost:3001/admin.html) |
| **Username** | `admin` |
| **Password** | `admin123` |
| **Role** | Super Administrator |

*(Passwords are securely hashed in MySQL using `bcryptjs`).*

---

## 📡 API Endpoint Reference

### Public Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend & MySQL connection health check |
| `GET` | `/api/rooms` | Fetch all room categories and pricing |
| `GET` | `/api/rooms/availability` | Real-time conflict-free room availability |
| `POST` | `/api/reservations` | Submit room booking (server calculates totals & advance) |
| `GET` | `/api/menu` | Fetch food menu dishes from MySQL |
| `POST` | `/api/orders` | Place in-room dining order (MySQL transaction) |
| `GET` | `/api/orders/:orderNumber` | Live kitchen order tracking by reference |
| `POST` | `/api/contact` | Submit guest inquiry to concierge |
| `POST` | `/api/admin/login` | Authenticate admin user & receive JWT token |

### Protected Admin Endpoints (`Authorization: Bearer <JWT>`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Aggregated dashboard statistics & revenue totals |
| `GET` | `/api/admin/reservations` | Retrieve all guest reservations |
| `PATCH` | `/api/admin/reservations/:id` | Update booking status (`confirmed`, `cancelled`, `pending`) |
| `DELETE`| `/api/admin/reservations/:id` | Permanently delete reservation |
| `GET` | `/api/admin/food-orders` | Retrieve all in-room dining orders |
| `PATCH` | `/api/admin/food-orders/:id` | Update food order status (`preparing`, `delivered`, `cancelled`) |
| `DELETE`| `/api/admin/food-orders/:id` | Delete food order |
| `GET` | `/api/admin/contacts` | Retrieve all customer inquiry messages |
| `GET` | `/api/admin/members` | Retrieve all loyalty members |
| `DELETE`| `/api/admin/members/:id` | Remove loyalty member |
| `GET` | `/api/admin/users` | List admin user accounts |
| `POST` | `/api/admin/create-user` | Create new admin account with bcrypt hash |
| `PATCH` | `/api/admin/change-password` | Update admin password with verification |
| `DELETE`| `/api/admin/users/:id` | Delete admin account (protects primary admin) |

---

## 🛡️ Security Features
- **Parameterized SQL Queries:** Prevents SQL injection across all queries.
- **Server-Side Pricing Authoritative:** Room and dining totals are recalculated server-side; client totals are never blindly trusted.
- **Overlapping Booking Prevention:** MySQL query checks whether a room of that category is already confirmed for conflicting date ranges.
- **Bcrypt Password Hashing:** Salted hashes for all administrator credentials.
- **JWT Authentication:** Strict Bearer token verification with expiration.
- **Rate Limiting:** Protects endpoints against brute-force attacks and form spam.
