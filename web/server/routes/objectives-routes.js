import { validate, ObjectiveSchema, KeyResultSchema } from '../helpers/validators.js';

function computeProgress(startValue, currentValue, targetValue) {
    const range = targetValue - startValue;
    if (range === 0) {
        return currentValue >= targetValue ? 100 : 0;
    }
    const raw = ((currentValue - startValue) / range) * 100;
    return Math.max(0, Math.min(100, Math.round(raw * 100) / 100));
}

function inferKrStatus(progress) {
    if (progress >= 100) return 'done';
    if (progress >= 70) return 'on_track';
    if (progress >= 40) return 'at_risk';
    return 'off_track';
}

function parsePeriodRange(period) {
    if (!period || typeof period !== 'string') {
        return null;
    }

    const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
    if (quarterMatch) {
        const year = Number(quarterMatch[1]);
        const quarter = Number(quarterMatch[2]);
        const startMonth = (quarter - 1) * 3;
        const start = Date.UTC(year, startMonth, 1);
        const end = Date.UTC(year, startMonth + 3, 1);
        return { start, end };
    }

    const yearMatch = period.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = Number(yearMatch[1]);
        const start = Date.UTC(year, 0, 1);
        const end = Date.UTC(year + 1, 0, 1);
        return { start, end };
    }

    return null;
}

function computeExpectedProgress(period, nowMs = Date.now()) {
    const range = parsePeriodRange(period);
    if (!range) {
        return null;
    }

    if (nowMs <= range.start) return 0;
    if (nowMs >= range.end) return 100;

    const elapsed = (nowMs - range.start) / (range.end - range.start);
    return Math.max(0, Math.min(100, Math.round(elapsed * 10000) / 100));
}

function getDaysWithoutUpdate(updatedAt, nowMs = Date.now()) {
    const parsed = Date.parse(updatedAt || '');
    if (Number.isNaN(parsed)) {
        return null;
    }
    const days = Math.floor((nowMs - parsed) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
}

function assessKrRisk(row, progress, nowMs = Date.now()) {
    const expectedProgress = computeExpectedProgress(row.objective_period, nowMs);
    const deviation = expectedProgress == null ? null : Math.round((expectedProgress - progress) * 100) / 100;
    const daysWithoutUpdate = getDaysWithoutUpdate(row.updated_at, nowMs);
    const isNoProgress = Number(row.current_value) === Number(row.start_value);

    const reasons = [];
    let score = 0;

    if (daysWithoutUpdate != null && daysWithoutUpdate >= 7 && isNoProgress && progress < 100) {
        reasons.push({
            code: 'no_progress_7d',
            label: 'Sin avance en los ultimos 7 dias',
        });
        score += 2;
    }

    if (daysWithoutUpdate != null && daysWithoutUpdate >= 14 && progress < 100) {
        reasons.push({
            code: 'stalled_14d',
            label: 'KR estancado por mas de 14 dias',
        });
        score += 2;
    }

    if (deviation != null && deviation >= 20 && progress < 100) {
        reasons.push({
            code: 'behind_expected_progress',
            label: `Desvio de ${Math.round(deviation)}% contra el progreso esperado`,
        });
        score += 2;
    }

    if (deviation != null && expectedProgress != null && expectedProgress >= 60 && progress < 30) {
        reasons.push({
            code: 'severe_gap',
            label: 'Brecha severa entre progreso actual y esperado',
        });
        score += 2;
    }

    if (row.status === 'off_track') {
        reasons.push({
            code: 'status_off_track',
            label: 'Estado marcado como off_track',
        });
        score += 1;
    } else if (row.status === 'at_risk') {
        reasons.push({
            code: 'status_at_risk',
            label: 'Estado marcado como at_risk',
        });
        score += 1;
    }

    let level = 'low';
    if (score >= 4) level = 'high';
    else if (score >= 2) level = 'medium';

    return {
        level,
        score,
        reasons,
        expectedProgress,
        deviation,
        daysWithoutUpdate,
    };
}

function mapObjectiveRow(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        period: row.period,
        status: row.status,
        areaId: row.area_id || null,
        progress: row.progress || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapKrRow(row) {
    const progress = computeProgress(row.start_value, row.current_value, row.target_value);
    return {
        id: row.id,
        objectiveId: row.objective_id,
        title: row.title,
        metricType: row.metric_type,
        startValue: row.start_value,
        targetValue: row.target_value,
        currentValue: row.current_value,
        unit: row.unit || null,
        progress,
        status: row.status || inferKrStatus(progress),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function registerObjectivesRoutes(app, deps) {
    const { getDbManager, generateId } = deps;
    let dbInitialized = false;

    function makeId(prefix) {
        if (typeof generateId === 'function') {
            const raw = generateId();
            if (raw && !raw.startsWith(`${prefix}-`)) {
                return `${prefix}-${raw}`;
            }
            return raw;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    async function getDb() {
        const db = getDbManager();
        if (!dbInitialized) {
            await db.initialize();
            dbInitialized = true;
        }
        return db;
    }

    app.get('/api/objectives', async (req, res) => {
        try {
            const db = await getDb();
            const conditions = [];
            const params = [];

            if (req.query.status) {
                conditions.push('o.status = ?');
                params.push(req.query.status);
            }
            if (req.query.period) {
                conditions.push('o.period = ?');
                params.push(req.query.period);
            }
            if (req.query.areaId) {
                conditions.push('o.area_id = ?');
                params.push(req.query.areaId);
            }

            let query = `
                SELECT
                    o.*,
                    COALESCE(AVG(
                        CASE
                            WHEN (kr.target_value - kr.start_value) = 0 THEN
                                CASE WHEN kr.current_value >= kr.target_value THEN 100 ELSE 0 END
                            ELSE ((kr.current_value - kr.start_value) * 100.0 / (kr.target_value - kr.start_value))
                        END
                    ), 0) AS progress
                FROM objectives o
                LEFT JOIN key_results kr ON kr.objective_id = o.id
            `;

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ' GROUP BY o.id ORDER BY o.created_at DESC';
            const rows = db.query(query, params);
            res.json(rows.map(mapObjectiveRow));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/objectives/:objectiveId', async (req, res) => {
        try {
            const db = await getDb();
            const { objectiveId } = req.params;

            const row = db.queryOne(`
                SELECT
                    o.*,
                    COALESCE(AVG(
                        CASE
                            WHEN (kr.target_value - kr.start_value) = 0 THEN
                                CASE WHEN kr.current_value >= kr.target_value THEN 100 ELSE 0 END
                            ELSE ((kr.current_value - kr.start_value) * 100.0 / (kr.target_value - kr.start_value))
                        END
                    ), 0) AS progress
                FROM objectives o
                LEFT JOIN key_results kr ON kr.objective_id = o.id
                WHERE o.id = ?
                GROUP BY o.id
            `, [objectiveId]);

            if (!row) {
                return res.status(404).json({ error: 'Objective not found' });
            }

            const keyResults = db.query(
                'SELECT * FROM key_results WHERE objective_id = ? ORDER BY created_at DESC',
                [objectiveId]
            ).map(mapKrRow);

            res.json({
                ...mapObjectiveRow(row),
                keyResults,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/objectives', validate(ObjectiveSchema), async (req, res) => {
        try {
            const db = await getDb();
            const id = makeId('obj');
            const now = new Date().toISOString();
            const payload = req.validatedBody;

            db.exec(`
                INSERT INTO objectives (id, title, description, period, status, area_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                payload.title.trim(),
                payload.description || null,
                payload.period,
                payload.status || 'active',
                payload.areaId || null,
                now,
                now,
            ]);

            const created = db.queryOne('SELECT * FROM objectives WHERE id = ?', [id]);
            res.status(201).json(mapObjectiveRow({ ...created, progress: 0 }));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/objectives/:objectiveId', validate(ObjectiveSchema.partial()), async (req, res) => {
        try {
            const db = await getDb();
            const { objectiveId } = req.params;
            const payload = req.validatedBody;

            const existing = db.queryOne('SELECT id FROM objectives WHERE id = ?', [objectiveId]);
            if (!existing) {
                return res.status(404).json({ error: 'Objective not found' });
            }

            const fields = [];
            const params = [];
            const map = {
                title: 'title',
                description: 'description',
                period: 'period',
                status: 'status',
                areaId: 'area_id',
            };

            for (const [key, dbField] of Object.entries(map)) {
                if (payload[key] !== undefined) {
                    fields.push(`${dbField} = ?`);
                    params.push(payload[key]);
                }
            }
            fields.push('updated_at = ?');
            params.push(new Date().toISOString());
            params.push(objectiveId);

            if (fields.length > 0) {
                db.exec(`UPDATE objectives SET ${fields.join(', ')} WHERE id = ?`, params);
            }

            const updated = db.queryOne('SELECT * FROM objectives WHERE id = ?', [objectiveId]);
            res.json(mapObjectiveRow({ ...updated, progress: 0 }));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/objectives/:objectiveId', async (req, res) => {
        try {
            const db = await getDb();
            const { objectiveId } = req.params;
            const exists = db.queryOne('SELECT id FROM objectives WHERE id = ?', [objectiveId]);
            if (!exists) {
                return res.status(404).json({ error: 'Objective not found' });
            }

            db.exec('DELETE FROM objectives WHERE id = ?', [objectiveId]);
            res.json({ success: true, id: objectiveId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/key-results', async (req, res) => {
        try {
            const db = await getDb();
            const conditions = [];
            const params = [];
            if (req.query.objectiveId) {
                conditions.push('objective_id = ?');
                params.push(req.query.objectiveId);
            }
            if (req.query.status) {
                conditions.push('status = ?');
                params.push(req.query.status);
            }

            let query = 'SELECT * FROM key_results';
            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }
            query += ' ORDER BY created_at DESC';

            const rows = db.query(query, params);
            res.json(rows.map(mapKrRow));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/objectives/risk-signals', async (_req, res) => {
        try {
            const db = await getDb();
            const nowMs = Date.now();
            const rows = db.query(`
                SELECT
                    kr.*,
                    o.title AS objective_title,
                    o.period AS objective_period,
                    o.area_id AS objective_area_id
                FROM key_results kr
                INNER JOIN objectives o ON o.id = kr.objective_id
                WHERE o.status != 'done'
                ORDER BY kr.updated_at ASC
            `);

            const assessed = rows.map((row) => {
                const mappedKr = mapKrRow(row);
                const risk = assessKrRisk(row, mappedKr.progress, nowMs);
                return {
                    id: mappedKr.id,
                    title: mappedKr.title,
                    progress: mappedKr.progress,
                    status: mappedKr.status,
                    currentValue: mappedKr.currentValue,
                    targetValue: mappedKr.targetValue,
                    objectiveId: mappedKr.objectiveId,
                    objectiveTitle: row.objective_title,
                    objectivePeriod: row.objective_period,
                    objectiveAreaId: row.objective_area_id || null,
                    updatedAt: mappedKr.updatedAt,
                    risk,
                };
            });

            const risks = assessed
                .filter((kr) => kr.risk.level !== 'low')
                .sort((a, b) => {
                    const scoreDelta = b.risk.score - a.risk.score;
                    if (scoreDelta !== 0) return scoreDelta;
                    const devA = a.risk.deviation ?? -999;
                    const devB = b.risk.deviation ?? -999;
                    if (devB !== devA) return devB - devA;
                    const daysA = a.risk.daysWithoutUpdate ?? -1;
                    const daysB = b.risk.daysWithoutUpdate ?? -1;
                    return daysB - daysA;
                });

            const summary = {
                totalKrs: assessed.length,
                riskCount: risks.length,
                highRiskCount: risks.filter((r) => r.risk.level === 'high').length,
                stalledCount: risks.filter((r) => r.risk.reasons.some((reason) => reason.code === 'stalled_14d')).length,
                noProgressCount: risks.filter((r) => r.risk.reasons.some((reason) => reason.code === 'no_progress_7d')).length,
                behindScheduleCount: risks.filter((r) => r.risk.reasons.some((reason) => reason.code === 'behind_expected_progress')).length,
            };

            res.json({
                generatedAt: new Date(nowMs).toISOString(),
                summary,
                risks,
                focusWeek: risks.slice(0, 3),
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/key-results', validate(KeyResultSchema), async (req, res) => {
        try {
            const db = await getDb();
            const payload = req.validatedBody;
            const now = new Date().toISOString();
            const id = makeId('kr');
            const startValue = payload.startValue ?? 0;
            const currentValue = payload.currentValue ?? startValue;
            const progress = computeProgress(startValue, currentValue, payload.targetValue);

            const objective = db.queryOne('SELECT id FROM objectives WHERE id = ?', [payload.objectiveId]);
            if (!objective) {
                return res.status(400).json({ error: 'objectiveId is invalid' });
            }

            db.exec(`
                INSERT INTO key_results (
                    id, objective_id, title, metric_type, start_value, target_value, current_value, unit, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                payload.objectiveId,
                payload.title.trim(),
                payload.metricType || 'number',
                startValue,
                payload.targetValue,
                currentValue,
                payload.unit || null,
                payload.status || inferKrStatus(progress),
                now,
                now,
            ]);

            const created = db.queryOne('SELECT * FROM key_results WHERE id = ?', [id]);
            res.status(201).json(mapKrRow(created));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/key-results/:keyResultId', validate(KeyResultSchema.partial()), async (req, res) => {
        try {
            const db = await getDb();
            const { keyResultId } = req.params;
            const payload = req.validatedBody;
            const existing = db.queryOne('SELECT * FROM key_results WHERE id = ?', [keyResultId]);
            if (!existing) {
                return res.status(404).json({ error: 'Key result not found' });
            }

            if (payload.objectiveId) {
                const objective = db.queryOne('SELECT id FROM objectives WHERE id = ?', [payload.objectiveId]);
                if (!objective) {
                    return res.status(400).json({ error: 'objectiveId is invalid' });
                }
            }

            const fields = [];
            const params = [];
            const map = {
                objectiveId: 'objective_id',
                title: 'title',
                metricType: 'metric_type',
                startValue: 'start_value',
                targetValue: 'target_value',
                currentValue: 'current_value',
                unit: 'unit',
                status: 'status',
            };
            for (const [key, dbField] of Object.entries(map)) {
                if (payload[key] !== undefined) {
                    fields.push(`${dbField} = ?`);
                    params.push(payload[key]);
                }
            }

            fields.push('updated_at = ?');
            params.push(new Date().toISOString());
            params.push(keyResultId);

            db.exec(`UPDATE key_results SET ${fields.join(', ')} WHERE id = ?`, params);
            const updated = db.queryOne('SELECT * FROM key_results WHERE id = ?', [keyResultId]);
            res.json(mapKrRow(updated));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/key-results/:keyResultId/progress', async (req, res) => {
        try {
            const db = await getDb();
            const { keyResultId } = req.params;
            const { currentValue } = req.body;

            if (typeof currentValue !== 'number' || !Number.isFinite(currentValue)) {
                return res.status(400).json({ error: 'currentValue must be a finite number' });
            }

            const existing = db.queryOne('SELECT * FROM key_results WHERE id = ?', [keyResultId]);
            if (!existing) {
                return res.status(404).json({ error: 'Key result not found' });
            }

            const progress = computeProgress(existing.start_value, currentValue, existing.target_value);
            const status = inferKrStatus(progress);
            db.exec(`
                UPDATE key_results
                SET current_value = ?, status = ?, updated_at = ?
                WHERE id = ?
            `, [currentValue, status, new Date().toISOString(), keyResultId]);

            const updated = db.queryOne('SELECT * FROM key_results WHERE id = ?', [keyResultId]);
            res.json(mapKrRow(updated));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/key-results/:keyResultId', async (req, res) => {
        try {
            const db = await getDb();
            const { keyResultId } = req.params;
            const exists = db.queryOne('SELECT id FROM key_results WHERE id = ?', [keyResultId]);
            if (!exists) {
                return res.status(404).json({ error: 'Key result not found' });
            }
            db.exec('DELETE FROM key_results WHERE id = ?', [keyResultId]);
            res.json({ success: true, id: keyResultId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
