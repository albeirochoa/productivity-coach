import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Backup Manager
 * Gestiona backups automáticos de tasks-data.json y profile.json
 */
export class BackupManager {
  constructor(dataRoot) {
    this.dataRoot = dataRoot;
    this.backupDir = path.join(dataRoot, 'backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Backup directory created:', this.backupDir);
    }
  }

  /**
   * Crea backup de un archivo
   * @param {string} filename - Nombre del archivo (ej: 'tasks-data.json')
   * @returns {string} Path del backup creado
   */
  createBackup(filename) {
    const sourcePath = path.join(this.dataRoot, filename);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${path.parse(filename).name}-${timestamp}.json`;
    const backupPath = path.join(this.backupDir, backupFilename);

    fs.copyFileSync(sourcePath, backupPath);
    console.log(`✅ Backup created: ${backupFilename}`);

    return backupPath;
  }

  /**
   * Crea backups de todos los archivos críticos
   * @returns {Object} Paths de los backups creados
   */
  createAllBackups() {
    const backups = {};
    const files = ['tasks-data.json', 'profile.json'];

    files.forEach(file => {
      try {
        backups[file] = this.createBackup(file);
      } catch (error) {
        console.error(`❌ Error backing up ${file}:`, error.message);
      }
    });

    return backups;
  }

  /**
   * Limpia backups antiguos (mantiene solo los últimos N días)
   * @param {number} daysToKeep - Días de backups a conservar (default: 7)
   */
  cleanOldBackups(daysToKeep = 7) {
    const files = fs.readdirSync(this.backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;
    let skippedCount = 0;

    files.forEach(file => {
      try {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (error) {
        skippedCount++;
        console.warn(`⚠️  Could not process backup file "${file}": ${error.code || error.message}`);
      }
    });

    if (deletedCount > 0) {
      console.log(`🗑️  Deleted ${deletedCount} old backup(s)`);
    }

    if (skippedCount > 0) {
      console.log(`ℹ️  Skipped ${skippedCount} backup file(s) due to filesystem restrictions`);
    }
  }

  /**
   * Restaura desde un backup
   * @param {string} backupFilename - Nombre del archivo de backup
   * @param {string} targetFilename - Archivo destino (ej: 'tasks-data.json')
   */
  restore(backupFilename, targetFilename) {
    const backupPath = path.join(this.backupDir, backupFilename);
    const targetPath = path.join(this.dataRoot, targetFilename);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Crear backup del archivo actual antes de sobrescribir
    if (fs.existsSync(targetPath)) {
      const safetyBackup = `${path.parse(targetFilename).name}-before-restore-${Date.now()}.json`;
      fs.copyFileSync(targetPath, path.join(this.backupDir, safetyBackup));
      console.log(`⚠️  Safety backup created: ${safetyBackup}`);
    }

    fs.copyFileSync(backupPath, targetPath);
    console.log(`✅ Restored from backup: ${backupFilename} → ${targetFilename}`);
  }

  /**
   * Lista todos los backups disponibles
   * @returns {Array} Array de objetos con info de backups
   */
  listBackups() {
    const files = fs.readdirSync(this.backupDir);

    return files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.mtime,
          path: filePath,
        };
      })
      .sort((a, b) => b.created - a.created);
  }

  /**
   * Inicia backup automático diario
   * @param {number} intervalHours - Intervalo en horas (default: 24)
   */
  startAutoBackup(intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Crear backup inicial
    this.createAllBackups();
    this.cleanOldBackups();

    // Programar backups periódicos
    setInterval(() => {
      console.log('🕐 Running scheduled backup...');
      this.createAllBackups();
      this.cleanOldBackups();
    }, intervalMs);

    console.log(`⏰ Auto-backup enabled: every ${intervalHours}h`);
  }
}

/**
 * Factory para crear instancia compartida
 */
export function createBackupManager(dataRoot) {
  return new BackupManager(dataRoot);
}
