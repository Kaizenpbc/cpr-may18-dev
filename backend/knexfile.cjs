const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'gtacpr',
      database: process.env.DB_NAME || 'cpr_may18',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'src/db/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/seeds'),
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'src/db/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/seeds'),
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'gtacpr',
      database: process.env.DB_NAME_TEST || 'cpr_may18_test',
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'src/db/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/seeds'),
    },
  },
}; 