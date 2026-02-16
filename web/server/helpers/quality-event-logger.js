import logger from './logger.js';

function shorten(text, max = 400) {
    if (!text) return '';
    const str = String(text);
    return str.length <= max ? str : `${str.slice(0, max - 3)}...`;
}

function safeJson(value) {
    try {
        return JSON.stringify(value ?? {});
    } catch {
        return JSON.stringify({ error: 'serialization_failed' });
    }
}

export function logQualityEvent(db, generateId, payload = {}) {
    if (!db || typeof db.exec !== 'function') return;

    const {
        eventType = 'generated',
        kind = 'unknown',
        severity = 'low',
        title = 'Quality event',
        description = '',
        sessionId = null,
        tool = null,
        responseSource = null,
        metadata = {},
    } = payload;

    const safeType = ['generated', 'applied', 'rejected'].includes(eventType) ? eventType : 'generated';
    const safeSeverity = ['high', 'medium', 'low'].includes(severity) ? severity : 'low';

    try {
        db.exec(`
            INSERT INTO coach_events (
                id, event_type, rule_id, severity, title, description, reason, suggested_action, action_result, data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            generateId ? generateId('ceq') : `ceq-${Date.now()}`,
            safeType,
            `quality:${kind}`,
            safeSeverity,
            shorten(title, 120),
            shorten(description, 500),
            shorten(sessionId ? `session:${sessionId}` : 'session:none', 120),
            safeJson({ tool, responseSource }),
            safeJson(metadata.result || null),
            safeJson({ ...metadata, sessionId, tool, responseSource }),
            new Date().toISOString(),
        ]);
    } catch (error) {
        logger.debug('Could not log quality event', { error: error.message, kind });
    }
}

