const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Función mejorada para conectar con reintentos
const connectWithRetry = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a PostgreSQL establecida');
      return true;
    } catch (error) {
      console.log(`⏳ Intento ${i + 1}/${retries} - Esperando PostgreSQL...`);
      console.log(`   Error: ${error.message}`);
      
      if (i === retries - 1) {
        console.error('❌ No se pudo conectar a PostgreSQL después de todos los intentos');
        throw error;
      }
      
      // Esperar antes del próximo intento
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = { sequelize, connectWithRetry };