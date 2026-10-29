# 🏥 Pharmacy Inventory & Management System

A modern, full-stack Pharmacy Inventory Management System built with **React**, **Vite**, **Tailwind CSS**, and **Express.js**. Designed for high performance, zero-config deployment on **Vercel**, and seamless database switching between embedded SQLite and production MySQL.

---

## ✨ Features

- 📊 **Real-Time Dashboard**: Key performance metrics (Total Sales, Revenue, Low Stock Alerts, Expiring Soon, Recent Transactions).
- 💊 **Medicine & Inventory Management**: Categorized medicine catalogue, batch numbers, manufacturer info, stock alerts, expiry tracking.
- 📦 **Stock Control & Batches**: FIFO batch management, batch adjustments, stock movement audit logs.
- 🧾 **Point of Sale (POS) & Billing**: Fast billing terminal, invoice generation, customer receipts, PDF invoice export (`jspdf`).
- 🚚 **Supplier Directory**: Vendor contacts, GST tracking, purchase records.
- 📈 **Reports & Analytics**: Sales trends, top-selling items, inventory valuation, expiry forecasts with interactive charts (`recharts`).
- 👥 **Role-Based Access Control (RBAC)**: Secure JWT authentication with customized views for `admin`, `pharmacist`, and `cashier`.
- ⚡ **Zero-Config Database Engine**: Automatically runs built-in SQLite when deployed on Vercel or when MySQL is unavailable, with optional MySQL connectivity.

---

## 🔑 Demo Login Credentials

The application is pre-seeded with sample data and test accounts:

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full access (Users, Stock, Billing, Reports, Inventory) |
| **Pharmacist** | `pharmacist` | `pharma123` | Inventory, Stock Adjustments, Expiry, Billing |
| **Cashier** | `cashier` | `cash123` | Billing Terminal & Sales History |

---

## 🚀 One-Click Deploy to Vercel

This repository is optimized for deployment on [Vercel](https://vercel.com):

1. **Import the repository** into Vercel from GitHub (`https://github.com/mirzauzaif3-sketch/inventory-management-for-pharmacy`).
2. **Framework Preset**: Vite (or Other).
3. **Build & Output Settings**: Handled automatically by `vercel.json` (`npm run build` and `client/dist`).
4. **Environment Variables** (Optional):
   - `JWT_SECRET`: A secure random secret string (defaults to built-in fallback if omitted).
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Optional if using external MySQL. If omitted, the embedded SQLite engine activates automatically with pre-seeded data!
5. Click **Deploy**!

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- Node.js (v20+ or v22+ recommended)
- npm or yarn

### 2. Clone Repository
```bash
git clone https://github.com/mirzauzaif3-sketch/inventory-management-for-pharmacy.git
cd inventory-management-for-pharmacy
```

### 3. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Run Locally

**Start Backend Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Start Frontend Application:**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 📁 Project Structure

```
├── api/
│   └── index.js             # Vercel serverless function entry point
├── client/
│   ├── public/              # Static public assets
│   ├── src/
│   │   ├── components/      # UI & Layout components (Navbar, Sidebar, etc.)
│   │   ├── context/         # Auth & state contexts
│   │   ├── pages/           # Dashboard, Medicines, Stock, Billing, Reports, Users
│   │   ├── App.jsx          # App routing
│   │   └── main.jsx         # Client mount
│   ├── package.json
│   └── vite.config.js       # Vite dev server & proxy settings
├── server/
│   ├── config/              # Database proxy & SQLite compatibility engine
│   ├── controllers/         # Express request handlers
│   ├── middleware/          # JWT auth & role authorization
│   ├── routes/              # Modular API endpoints
│   ├── pharmacy.db          # Embedded pre-seeded SQLite database
│   ├── schema.sql           # MySQL database schema
│   ├── seed.js              # Database seeder script
│   ├── server.js            # Express server
│   └── package.json
├── vercel.json              # Vercel deployment & routing configuration
├── package.json             # Root build orchestration
└── README.md
```

---

## 🔒 Environment Variables

See [.env.example](.env.example) for reference:

```env
PORT=5000
JWT_SECRET=pharmacy_jwt_secret_key_2024
JWT_EXPIRES_IN=24h

# Optional external MySQL configuration:
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=pharmacy_db
```

---

## 📄 License

This project is licensed under the MIT License.
