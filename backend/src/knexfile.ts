import path from 'path';

const useSqlite = process.env.DATABASE_CLIENT !== 'pg';

const knexConfig = useSqlite
  ? {
      client: 'better-sqlite3',
      connection: {
        filename: path.resolve(__dirname, '../data/logistics.db'),
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.resolve(__dirname, '../database/migrations-sqlite'),
        extension: 'ts',
      },
    }
  : {
      client: 'pg',
      connection: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        database: process.env.DATABASE_NAME || 'logistics',
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
      },
      pool: { min: 2, max: 10 },
      migrations: {
        directory: path.resolve(__dirname, '../../database/migrations'),
        extension: 'ts',
      },
    };

export default knexConfig;
