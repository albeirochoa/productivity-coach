/**
 * Slot Normalizer (Fase 10.3A - AR-003)
 *
 * Normalizes Spanish natural language input into structured slot values:
 * - Period: "primer semestre 2026" -> "2026-H1"
 * - Date: "mañana", "hoy", "lunes" -> "YYYY-MM-DD"
 * - Area: user label -> areaId
 */

import logger from './logger.js';

// ── Period normalization ──────────────────────────────────────

const PERIOD_PATTERNS = [
    // Semestres (with optional "del"/"de")
    { pattern: /primer semestre (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-H1` },
    { pattern: /segundo semestre (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-H2` },
    { pattern: /semestre 1 (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-H1` },
    { pattern: /semestre 2 (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-H2` },
    { pattern: /(\d{4})-H1/i, format: (y) => `${y}-H1` },
    { pattern: /(\d{4})-H2/i, format: (y) => `${y}-H2` },

    // Trimestres (with optional "del"/"de")
    { pattern: /primer trimestre (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q1` },
    { pattern: /segundo trimestre (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q2` },
    { pattern: /tercer trimestre (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q3` },
    { pattern: /cuarto trimestre (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q4` },
    { pattern: /trimestre 1 (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q1` },
    { pattern: /trimestre 2 (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q2` },
    { pattern: /trimestre 3 (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q3` },
    { pattern: /trimestre 4 (?:del?|de)?\s*(\d{4})/i, format: (y) => `${y}-Q4` },
    { pattern: /(\d{4})-Q1/i, format: (y) => `${y}-Q1` },
    { pattern: /(\d{4})-Q2/i, format: (y) => `${y}-Q2` },
    { pattern: /(\d{4})-Q3/i, format: (y) => `${y}-Q3` },
    { pattern: /(\d{4})-Q4/i, format: (y) => `${y}-Q4` },

    // Year only
    { pattern: /^(\d{4})$/i, format: (y) => `${y}` },
];

/**
 * Normalize period expression to canonical format.
 * Returns { value: string, error: string|null }
 */
export function normalizePeriod(input) {
    if (!input) return { value: null, error: 'Periodo requerido' };

    const trimmed = String(input).trim();

    for (const { pattern, format } of PERIOD_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match) {
            const year = match[1];
            const value = format(year);
            logger.debug('Period normalized', { input: trimmed, output: value });
            return { value, error: null };
        }
    }

    return {
        value: null,
        error: `No pude interpretar el periodo "${trimmed}". Ejemplos: "primer semestre 2026", "segundo trimestre 2026", "2026-Q1"`,
    };
}

// ── Date normalization ────────────────────────────────────────

const DATE_RELATIVE_PATTERNS = {
    hoy: 0,
    'ma?ñana': 1,
    pasado: 2,
    'pasado ma?ñana': 2,
};

const WEEKDAY_NAMES = {
    lunes: 1,
    martes: 2,
    'mi[eé]rcoles': 3,
    jueves: 4,
    viernes: 5,
    'sábado': 6,
    sabado: 6,
    domingo: 0,
};

/**
 * Normalize date expression to YYYY-MM-DD.
 * Handles: "hoy", "mañana", "lunes", "2026-02-15", etc.
 * Returns { value: string, error: string|null }
 */
export function normalizeDate(input) {
    if (!input) return { value: null, error: 'Fecha requerida' };

    const trimmed = String(input).trim().toLowerCase();
    const now = new Date();

    // Check relative patterns (hoy, mañana, etc.)
    for (const [key, offset] of Object.entries(DATE_RELATIVE_PATTERNS)) {
        const regex = new RegExp(`^${key}$`, 'i');
        if (regex.test(trimmed)) {
            const target = new Date(now);
            target.setDate(target.getDate() + offset);
            const value = target.toISOString().split('T')[0];
            logger.debug('Date normalized (relative)', { input: trimmed, output: value });
            return { value, error: null };
        }
    }

    // Check weekday patterns (lunes, martes, etc.)
    for (const [key, targetDay] of Object.entries(WEEKDAY_NAMES)) {
        const regex = new RegExp(`^${key}$`, 'i');
        if (regex.test(trimmed)) {
            const currentDay = now.getDay();
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence

            const target = new Date(now);
            target.setDate(target.getDate() + daysToAdd);
            const value = target.toISOString().split('T')[0];
            logger.debug('Date normalized (weekday)', { input: trimmed, output: value });
            return { value, error: null };
        }
    }

    // Check if already YYYY-MM-DD format
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        logger.debug('Date normalized (ISO)', { input: trimmed, output: trimmed });
        return { value: trimmed, error: null };
    }

    // Check DD/MM/YYYY format
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        logger.debug('Date normalized (slash)', { input: trimmed, output: value });
        return { value, error: null };
    }

    return {
        value: null,
        error: `No pude interpretar la fecha "${trimmed}". Ejemplos: "hoy", "mañana", "lunes", "2026-02-15"`,
    };
}

// ── Area normalization ────────────────────────────────────────

/**
 * Normalize area label to areaId.
 * Matches against area names and aliases.
 * Returns { value: string, error: string|null }
 */
export async function normalizeArea(input, deps) {
    if (!input) return { value: null, error: null }; // Area is optional

    const trimmed = String(input).trim().toLowerCase();
    const normalize = (v) => String(v || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const normalizedInput = normalize(trimmed);
    const { readJson, getDbManager } = deps;

    try {
        // Load areas from both profile.json and DB
        const profileData = await readJson('profile.json').catch(() => ({}));
        const profileAreas = Object.entries(profileData.life_areas || {}).map(([id, area]) => ({
            id,
            name: area.name || id,
            aliases: area.aliases || [],
        }));

        let dbAreas = [];
        try {
            const db = getDbManager();
            const hasAreasTable = db.queryOne(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'areas'"
            );
            if (hasAreasTable) {
                dbAreas = db.query('SELECT * FROM areas WHERE status = ?', ['active']).map((row) => ({
                    id: row.id || row.area_id || row.slug,
                    name: row.name,
                    aliases: [],
                }));
            }
        } catch (_error) {
            dbAreas = [];
        }

        const allAreas = [...dbAreas, ...profileAreas];

        // Try exact match on ID
        const exactId = allAreas.find(a => normalize(a.id) === normalizedInput);
        if (exactId) {
            logger.debug('Area normalized (exact id)', { input: trimmed, output: exactId.id });
            return { value: exactId.id, error: null };
        }

        // Try exact match on name
        const exactName = allAreas.find(a => normalize(a.name) === normalizedInput);
        if (exactName) {
            logger.debug('Area normalized (exact name)', { input: trimmed, output: exactName.id });
            return { value: exactName.id, error: null };
        }

        // Try alias match
        for (const area of allAreas) {
            if (area.aliases && area.aliases.some(alias => normalize(alias) === normalizedInput)) {
                logger.debug('Area normalized (alias)', { input: trimmed, output: area.id });
                return { value: area.id, error: null };
            }
        }

        // Try partial match on name (fallback)
        const partial = allAreas.find(a => normalize(a.name).includes(normalizedInput) || normalizedInput.includes(normalize(a.name)));
        if (partial) {
            logger.debug('Area normalized (partial)', { input: trimmed, output: partial.id });
            return { value: partial.id, error: null };
        }

        const areaNames = allAreas.map(a => a.name).join(', ');
        return {
            value: null,
            error: `No encontré el área "${trimmed}". Áreas disponibles: ${areaNames}`,
        };
    } catch (error) {
        logger.error('Area normalization failed', { input: trimmed, error: error.message });
        return { value: null, error: 'Error al buscar área' };
    }
}

// ── Generic slot normalizer ───────────────────────────────────

/**
 * Normalize a slot value based on its type.
 * Returns { value: any, error: string|null }
 */
export async function normalizeSlot(slotName, value, deps) {
    if (slotName === 'period') {
        return normalizePeriod(value);
    }

    if (slotName === 'date' || slotName === 'dueDate') {
        return normalizeDate(value);
    }

    if (slotName === 'area' || slotName === 'areaId') {
        return await normalizeArea(value, deps);
    }

    // Passthrough for other types
    return { value, error: null };
}
