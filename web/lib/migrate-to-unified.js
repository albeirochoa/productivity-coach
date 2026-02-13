/**
 * Script de migración: Sistema unificado de Tasks
 *
 * Migra los datos de:
 * - coach-data.json (inbox + commitments)
 * - backlog/*.json (projects)
 *
 * Al nuevo modelo unificado en tasks-data.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_ROOT = path.join(__dirname, '../..');

async function migrate() {
    console.log('🚀 Iniciando migración al sistema unificado...\n');

    // 1. Leer datos actuales
    const coachData = JSON.parse(
        await fs.readFile(path.join(DATA_ROOT, 'coach-data.json'), 'utf8')
    );

    // 2. Leer proyectos existentes
    const backlogPath = path.join(DATA_ROOT, 'backlog');
    const projectFiles = await fs.readdir(backlogPath);
    const projects = [];

    for (const file of projectFiles) {
        if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(backlogPath, file), 'utf8');
            projects.push(JSON.parse(content));
        }
    }

    // 3. Crear nuevo modelo de datos
    const unifiedData = {
        config: coachData.config,

        // Inbox se mantiene igual (captura rápida)
        inbox: coachData.inbox,

        // Nueva estructura: Tasks unificadas
        tasks: [],

        // Stats actualizado
        stats: {
            ...coachData.stats,
            tasks_completed: coachData.stats.total_completed || 0,
            projects_completed: 0
        },

        // Metadata de migración
        migration: {
            version: '2.0',
            migrated_at: new Date().toISOString(),
            source: 'coach-data.json + backlog/*.json'
        }
    };

    // 4. Migrar commitments actuales → tasks simples con thisWeek: true
    const currentWeek = coachData.current_week?.week || getCurrentWeek();

    if (coachData.current_week?.commitments) {
        for (const commitment of coachData.current_week.commitments) {
            unifiedData.tasks.push({
                id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: commitment.task,
                type: 'simple',
                status: commitment.completed ? 'done' : 'active',
                thisWeek: true,
                weekCommitted: currentWeek,
                category: commitment.category || 'trabajo',
                createdAt: commitment.committed_date || new Date().toISOString(),
                completedAt: commitment.completed_date || null,
                // Metadata de migración
                migratedFrom: {
                    type: 'commitment',
                    originalId: commitment.id
                }
            });
        }
        console.log(`✅ Migrados ${coachData.current_week.commitments.length} compromisos → tasks`);
    }

    // 5. Migrar proyectos → tasks tipo project
    for (const project of projects) {
        // Calcular progreso
        const totalMilestones = project.milestones?.length || 0;
        const completedMilestones = project.milestones?.filter(m => m.completed).length || 0;
        const currentMilestoneIndex = project.milestones?.findIndex(m => !m.completed) ?? 0;

        unifiedData.tasks.push({
            id: project.id,
            title: project.title,
            description: project.description || '',
            type: 'project',
            status: project.status === 'completed' ? 'done' : 'active',
            thisWeek: false, // Se activa cuando el usuario selecciona un milestone
            category: project.category || 'trabajo',
            strategy: project.strategy || 'goteo',
            createdAt: project.created_date || new Date().toISOString(),
            completedAt: project.status === 'completed' ? project.last_updated : null,

            // Estructura de proyecto
            milestones: (project.milestones || []).map((m, idx) => ({
                id: m.id || `milestone-${idx + 1}`,
                title: m.title,
                description: m.description || '',
                timeEstimate: m.tasks?.[0]?.time_estimate || 45,
                completed: m.completed || false,
                completedAt: m.completed_date || null
            })),
            currentMilestone: currentMilestoneIndex,

            // Metadata
            migratedFrom: {
                type: 'project',
                originalFile: `${project.id}.json`
            }
        });
    }
    console.log(`✅ Migrados ${projects.length} proyectos → tasks tipo project`);

    // 6. Guardar nuevo archivo
    const outputPath = path.join(DATA_ROOT, 'tasks-data.json');
    await fs.writeFile(outputPath, JSON.stringify(unifiedData, null, 4), 'utf8');
    console.log(`\n📁 Datos unificados guardados en: tasks-data.json`);

    // 7. Crear backup del archivo original
    const backupPath = path.join(DATA_ROOT, 'coach-data.backup.json');
    await fs.copyFile(path.join(DATA_ROOT, 'coach-data.json'), backupPath);
    console.log(`📦 Backup creado: coach-data.backup.json`);

    console.log('\n✨ Migración completada exitosamente!');
    console.log('\nResumen:');
    console.log(`  - Inbox items: ${(unifiedData.inbox.work?.length || 0) + (unifiedData.inbox.personal?.length || 0)}`);
    console.log(`  - Tasks simples: ${unifiedData.tasks.filter(t => t.type === 'simple').length}`);
    console.log(`  - Proyectos: ${unifiedData.tasks.filter(t => t.type === 'project').length}`);

    return unifiedData;
}

function getCurrentWeek() {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Ejecutar migración
migrate().catch(console.error);
