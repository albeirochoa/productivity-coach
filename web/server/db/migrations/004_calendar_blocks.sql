-- Migration 004: Calendar Blocks (Time Blocking)
-- Permite asignar tareas a bloques horarios específicos del día

CREATE TABLE IF NOT EXISTS calendar_blocks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM formato 24h
    end_time TEXT NOT NULL, -- HH:MM formato 24h
    duration_minutes INTEGER NOT NULL, -- Calculado automáticamente
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Índices para consultas comunes
CREATE INDEX IF NOT EXISTS idx_blocks_task_id ON calendar_blocks(task_id);
CREATE INDEX IF NOT EXISTS idx_blocks_date ON calendar_blocks(date);
CREATE INDEX IF NOT EXISTS idx_blocks_date_time ON calendar_blocks(date, start_time);
CREATE INDEX IF NOT EXISTS idx_blocks_status ON calendar_blocks(status);

-- Trigger para actualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_calendar_blocks_timestamp
AFTER UPDATE ON calendar_blocks
FOR EACH ROW
BEGIN
    UPDATE calendar_blocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
