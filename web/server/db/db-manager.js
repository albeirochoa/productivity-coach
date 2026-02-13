import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import logger from '../helpers/logger.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'productivity-coach.sqlite');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Database Manager
 * Handles:
 * - SQLite initialization
 * - Migration execution
 * - Query execution
 * - Backup/restore
 */
export class DatabaseManager {
    constructor(dbPath = DB_PATH) {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * Initialize database and run migrations
     */
    async initialize() {
        try {
            // Open or create database
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
            this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints

            logger.info('Database connected', { path: this.dbPath });

            // Run migrations
            await this.runMigrations();

            return { success: true, message: 'Database initialized' };
        } catch (error) {
            logger.error('Database initialization failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all executed migrations from database
     */
    getExecutedMigrations() {
        try {
            const migrations = this.db.prepare(
                `SELECT version FROM migrations WHERE status = 'success' ORDER BY version`
            ).all();
            return migrations.map(m => m.version);
        } catch (error) {
            // Table doesn't exist yet
            return [];
        }
    }

    /**
     * Get all migration files from disk
     */
    getAvailableMigrations() {
        if (!fs.existsSync(MIGRATIONS_DIR)) {
            return [];
        }

        return fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort();
    }

    /**
     * Run all pending migrations
     */
    async runMigrations() {
        const executed = this.getExecutedMigrations();
        const available = this.getAvailableMigrations();

        for (const migrationFile of available) {
            const version = migrationFile.replace('.sql', '');

            if (executed.includes(version)) {
                logger.debug(`Migration already executed: ${version}`);
                continue;
            }

            await this.executeMigration(migrationFile, version);
        }

        logger.info('All migrations completed');
    }

    /**
     * Execute a single migration file
     */
    async executeMigration(filename, version) {
        const filepath = path.join(MIGRATIONS_DIR, filename);
        const startTime = Date.now();

        try {
            const sql = fs.readFileSync(filepath, 'utf-8');

            // Execute entire SQL file (SQLite handles multiple statements with exec)
            this.db.exec(sql);

            const executionTime = Date.now() - startTime;

            // Record migration in database (if migrations table exists)
            try {
                this.db.prepare(
                    `INSERT INTO migrations (version, name, executed_at, execution_time_ms, status)
                     VALUES (?, ?, ?, ?, 'success')`
                ).run(version, filename, new Date().toISOString(), executionTime);
            } catch (e) {
                // Migrations table doesn't exist yet (first migration), skip recording
                logger.debug('Skipped recording migration (table not ready)', { version });
            }

            logger.info(`Migration executed: ${version}`, { executionTime });
        } catch (error) {
            logger.error(`Migration failed: ${version}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Execute a query with parameters
     */
    query(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(...params);
        } catch (error) {
            logger.error('Query execution failed', { error: error.message, sql });
            throw error;
        }
    }

    /**
     * Execute a single row query
     */
    queryOne(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.get(...params) || null;
        } catch (error) {
            logger.error('Query execution failed', { error: error.message, sql });
            throw error;
        }
    }

    /**
     * Execute insert/update/delete
     */
    exec(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...params);
            return { changes: result.changes, lastID: result.lastInsertRowid };
        } catch (error) {
            logger.error('Exec failed', { error: error.message, sql });
            throw error;
        }
    }

    /**
     * Start a transaction
     */
    transaction(fn) {
        const txn = this.db.transaction(fn);
        return txn();
    }

    /**
     * Get database info
     */
    getInfo() {
        const tables = this.query(
            `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
        );

        const migrations = this.getExecutedMigrations();

        return {
            path: this.dbPath,
            tables: tables.map(t => t.name),
            migrations,
            fileSize: fs.statSync(this.dbPath).size,
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            logger.info('Database connection closed');
        }
    }

    /**
     * Backup database to file
     */
    backup(backupPath) {
        try {
            const backupFile = path.join(backupPath, `productivity-coach-${Date.now()}.sqlite`);
            fs.copyFileSync(this.dbPath, backupFile);
            logger.info('Database backup created', { path: backupFile });
            return backupFile;
        } catch (error) {
            logger.error('Backup failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Restore database from backup
     */
    restore(backupPath) {
        try {
            this.close();
            fs.copyFileSync(backupPath, this.dbPath);
            logger.info('Database restored', { from: backupPath });
            return this.initialize();
        } catch (error) {
            logger.error('Restore failed', { error: error.message });
            throw error;
        }
    }
}

/**
 * Factory function
 */
export function createDatabaseManager(dbPath = DB_PATH) {
    return new DatabaseManager(dbPath);
}
