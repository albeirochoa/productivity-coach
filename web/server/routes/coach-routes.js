/**
 * Coach Routes (Fase 8)
 *
 * 3 endpoints:
 * - GET  /api/coach/recommendations  — Generate recommendations from current state
 * - POST /api/coach/apply             — Apply a recommended action
 * - POST /api/coach/reject            — Reject a recommendation (log reason)
 *
 * Plus:
 * - GET  /api/coach/history           — Recent coach events
 */

import { generateRecommendations, executeRecommendation, fetchRiskSignals, buildCapacityConfig } from '../helpers/coach-rules-engine.js';
import logger from '../helpers/logger.js';

export function registerCoachRoutes(app, deps) {
    const { readJson, writeJson, getDbManager, generateId, getCurrentWeek } = deps;

    let dbInitialized = false;

    async function getDb() {
        const db = getDbManager();
        if (!dbInitialized) {
            await db.initialize();
            dbInitialized = true;
        }
        return db;
    }

    function makeEventId() {
        return `ce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // ─── GET /api/coach/recommendations ──────────────────────
    app.get('/api/coach/recommendations', async (_req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const db = await getDb();
            const riskSignals = await fetchRiskSignals(db);

            const capacityConfig = buildCapacityConfig(data.config || {});

            const recommendations = generateRecommendations({
                tasks: data.tasks || [],
                inbox: data.inbox || { work: [], personal: [] },
                config: capacityConfig,
                riskSignals,
            });

            // Log generated event for each recommendation
            for (const rec of recommendations) {
                try {
                    db.exec(`
                        INSERT INTO coach_events (id, event_type, rule_id, severity, title, description, reason, suggested_action, data, created_at)
                        VALUES (?, 'generated', ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        makeEventId(),
                        rec.ruleId,
                        rec.severity,
                        rec.title,
                        rec.description,
                        rec.reason,
                        JSON.stringify(rec.suggestedAction || null),
                        JSON.stringify(rec.data || null),
                        rec.generatedAt,
                    ]);
                } catch (err) {
                    logger.debug('Could not log coach event', { error: err.message });
                }
            }

            res.json({
                generatedAt: new Date().toISOString(),
                count: recommendations.length,
                recommendations,
            });
        } catch (error) {
            logger.error('Coach recommendations failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ─── POST /api/coach/apply ───────────────────────────────
    app.post('/api/coach/apply', async (req, res) => {
        try {
            const { recommendationId, actionType, payload } = req.body;

            if (!actionType) {
                return res.status(400).json({ error: 'actionType is required' });
            }

            const result = await executeRecommendation(actionType, payload || {}, {
                readJson,
                writeJson,
                getCurrentWeek,
            });

            // Log applied event
            try {
                const db = await getDb();
                db.exec(`
                    INSERT INTO coach_events (id, event_type, rule_id, severity, title, description, suggested_action, action_result, created_at)
                    VALUES (?, 'applied', ?, 'medium', ?, ?, ?, ?, ?)
                `, [
                    makeEventId(),
                    actionType,
                    `Accion aplicada: ${actionType}`,
                    result.message || '',
                    JSON.stringify({ type: actionType, payload }),
                    JSON.stringify(result),
                    new Date().toISOString(),
                ]);
            } catch (err) {
                logger.debug('Could not log coach apply event', { error: err.message });
            }

            res.json(result);
        } catch (error) {
            logger.error('Coach apply failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ─── POST /api/coach/reject ──────────────────────────────
    app.post('/api/coach/reject', async (req, res) => {
        try {
            const { recommendationId, ruleId, reason } = req.body;

            if (!ruleId) {
                return res.status(400).json({ error: 'ruleId is required' });
            }

            // Log rejected event
            try {
                const db = await getDb();
                db.exec(`
                    INSERT INTO coach_events (id, event_type, rule_id, severity, title, description, rejection_reason, created_at)
                    VALUES (?, 'rejected', ?, 'low', ?, ?, ?, ?)
                `, [
                    makeEventId(),
                    ruleId,
                    `Recomendacion descartada: ${ruleId}`,
                    reason || '',
                    reason || 'Sin motivo especificado',
                    new Date().toISOString(),
                ]);
            } catch (err) {
                logger.debug('Could not log coach reject event', { error: err.message });
            }

            res.json({ success: true, message: 'Recomendacion descartada' });
        } catch (error) {
            logger.error('Coach reject failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ─── GET /api/coach/history ──────────────────────────────
    app.get('/api/coach/history', async (req, res) => {
        try {
            const db = await getDb();
            const limit = parseInt(req.query.limit) || 20;
            const eventType = req.query.type; // optional filter

            let query = 'SELECT * FROM coach_events';
            const params = [];

            if (eventType) {
                query += ' WHERE event_type = ?';
                params.push(eventType);
            }

            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const rows = db.query(query, params);
            const events = rows.map(row => ({
                id: row.id,
                eventType: row.event_type,
                ruleId: row.rule_id,
                severity: row.severity,
                title: row.title,
                description: row.description,
                reason: row.reason,
                suggestedAction: row.suggested_action ? JSON.parse(row.suggested_action) : null,
                actionResult: row.action_result ? JSON.parse(row.action_result) : null,
                rejectionReason: row.rejection_reason,
                data: row.data ? JSON.parse(row.data) : null,
                createdAt: row.created_at,
            }));

            res.json({ count: events.length, events });
        } catch (error) {
            logger.error('Coach history failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });
}
