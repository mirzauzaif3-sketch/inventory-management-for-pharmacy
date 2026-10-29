const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const medicinesRoutes = require('./routes/medicines');
const categoriesRoutes = require('./routes/categories');
const stockRoutes = require('./routes/stock');
const billingRoutes = require('./routes/billing');
const suppliersRoutes = require('./routes/suppliers');
const reportsRoutes = require('./routes/reports');

const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/medicines', medicinesRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/stock', stockRoutes);
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/suppliers', suppliersRoutes);
apiRouter.use('/reports', reportsRoutes);

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pharmacy API is running' });
});

// Mount router on both /api and root to seamlessly handle both direct and Vercel rewritten requests
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Pharmacy server running on port ${PORT}`);
  });
}

module.exports = app;
