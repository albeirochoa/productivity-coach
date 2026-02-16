import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import AIService from '../lib/ai-service.js';
import { createDbStore } from './helpers/db-store.js';
import { generateId, getCurrentWeek } from './helpers/task-utils.js';
import { createBackupManager } from './helpers/backup-manager.js';
import logger, { requestLogger, errorHandler } from './helpers/logger.js';
import { registerTaskRoutes } from './routes/tasks-routes.js';
import { registerInboxRoutes } from './routes/inbox-routes.js';
import { registerStatsRoutes } from './routes/stats-routes.js';
import { registerProjectsRoutes } from './routes/projects-routes.js';
import { registerLegacyRoutes } from './routes/legacy-routes.js';
import { registerChatRoutes } from './routes/chat-routes.js';
import { registerCapacityRoutes } from './routes/capacity-routes.js';
import { registerCalendarRoutes } from './routes/calendar-routes.js';
import { registerAreasRoutes } from './routes/areas-routes.js';
import { registerObjectivesRoutes } from './routes/objectives-routes.js';
import { registerCoachRoutes } from './routes/coach-routes.js';
import { registerCoachChatRoutes } from './routes/coach-chat-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_ROOT = path.join(__dirname, '..', '..');

export function createApp() {
    const app = express();

    // Initialize backup manager first
    const backupManager = createBackupManager(DATA_ROOT);
    backupManager.startAutoBackup(24); // Backup every 24 hours

    // Healthcheck endpoint (BEFORE middleware)
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            backups: backupManager.listBackups().length,
        });
    });

    // Middleware
    app.use(cors());
    app.use(bodyParser.json({ charset: 'utf-8' }));
    app.use((req, res, next) => {
        res.set('Content-Type', 'application/json; charset=utf-8');
        next();
    });
    app.use(requestLogger); // Log all requests

    // Backup management endpoints
    app.post('/api/backup/create', (req, res) => {
        try {
            const backups = backupManager.createAllBackups();
            logger.info('Manual backup created', { backups });
            res.json({ success: true, backups });
        } catch (error) {
            logger.error('Backup creation failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/backup/list', (req, res) => {
        try {
            const backups = backupManager.listBackups();
            res.json({ backups });
        } catch (error) {
            logger.error('Failed to list backups', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // Data access (SQLite-backed, same interface as json-store)
    const dbStore = createDbStore();
    const { readJson, writeJson, getDbManager, readCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock } = dbStore;
    const sharedDeps = { readJson, writeJson, generateId, getCurrentWeek, getDbManager };
    const objectivesEnabled = process.env.FF_OBJECTIVES_ENABLED !== 'false';

    // Register routes
    registerTaskRoutes(app, sharedDeps);
    registerInboxRoutes(app, sharedDeps);
    registerStatsRoutes(app, { readJson });
    registerProjectsRoutes(app, { readJson, writeJson, AIService });
    registerLegacyRoutes(app, { readJson, writeJson, getCurrentWeek });
    registerChatRoutes(app, { readJson, writeJson });
    registerCapacityRoutes(app, { readJson, writeJson });
    registerCalendarRoutes(app, { readJson, readCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock });
    registerAreasRoutes(app, { readJson, writeJson });
    if (objectivesEnabled) {
        registerObjectivesRoutes(app, { getDbManager, generateId });
    }
    const coachEnabled = process.env.FF_COACH_RULES_ENABLED !== 'false';
    if (coachEnabled) {
        registerCoachRoutes(app, { readJson, writeJson, getDbManager, generateId, getCurrentWeek });
    }
    const coachChatEnabled = process.env.FF_COACH_CHAT_ACTIONS_ENABLED !== 'false';
    if (coachEnabled && coachChatEnabled) {
        registerCoachChatRoutes(app, {
            readJson, writeJson, getDbManager, generateId, getCurrentWeek,
            readCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock,
        });
    }

    // Error handler (must be last)
    app.use(errorHandler);

    logger.info('✅ Productivity Coach API initialized');

    return app;
}
