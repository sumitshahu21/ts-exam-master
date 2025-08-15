import * as sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: 'ntms-sql-server.database.windows.net',
  port: 1433,
  database: 'exam_db',
  user: 'ntms',
  password: 'Dev@2024Test!',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

class DatabaseService {
  private static instance: DatabaseService;
  private pool: sql.ConnectionPool | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<sql.ConnectionPool> {
    try {
      if (this.pool) {
        return this.pool;
      }

      this.pool = await sql.connect(config);
      console.log('Connected to Azure SQL Database');
      return this.pool;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  public async getPool(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      return this.connect();
    }
    return this.pool;
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      console.log('Database connection closed');
    }
  }

  public async executeQuery(query: string, inputs?: any[]): Promise<sql.IResult<any>> {
    try {
      const pool = await this.getPool();
      const request = pool.request();
      
      // Add input parameters if provided
      if (inputs) {
        inputs.forEach((input, index) => {
          request.input(`param${index}`, input);
        });
      }
      
      return await request.query(query);
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }
}

export default DatabaseService;
