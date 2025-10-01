// src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();
require('express-async-errors'); // Automatic async error handling

// Import logger
const logger = require('./config/logger');

// Import configuration and models
const { sequelize, connectWithRetry } = require('./config/database');
require('./models'); // Load models and relations

// Import routes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

// Import middlewares
const errorHandler = require('./middlewares/errorHandler');

// Create Express application
const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tasks API with Docker',
      version: '1.0.0',
      description: 'REST API for task management with JWT authentication, PostgreSQL and Docker',
      contact: {
        name: 'Your Name',
        email: 'your@email.com',
        url: 'https://github.com/your-username/api-tareas-docker'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Invalid or missing token'
        },
        NotFoundError: {
          description: 'Resource not found'
        },
        ValidationError: {
          description: 'Validation error'
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and user management endpoints'
      },
      {
        name: 'Tasks',
        description: 'Task CRUD operations'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit 100 requests per IP
  message: 'Too many requests from this IP, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts every 15 minutes
  skipSuccessfulRequests: true
});

// Global middlewares
app.use(helmet()); // Security
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging with Winston
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/registro', authLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: 'Database connection failed'
    });
  }
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Tasks API',
    version: '1.0.0',
    description: 'REST API with Node.js, PostgreSQL and Docker',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      tasks: {
        list: 'GET /api/tasks',
        get: 'GET /api/tasks/:id',
        create: 'POST /api/tasks',
        update: 'PUT /api/tasks/:id',
        delete: 'DELETE /api/tasks/:id',
        statistics: 'GET /api/tasks/statistics'
      }
    }
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tasks API - Documentation'
}));

// Swagger JSON specification
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Server startup function
const startServer = async () => {
  try {
    // Connect to database with retry
    await connectWithRetry();
    logger.info('Connected to database');

    // Sync models
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    // Start server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('================================================');
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Docs at http://localhost:${PORT}/api-docs`);
      logger.info(`Health at http://localhost:${PORT}/health`);
      logger.info(`PgAdmin at http://localhost:5050`);
      logger.info('================================================');
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, closing server...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await sequelize.close();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error closing database:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Start server
startServer();