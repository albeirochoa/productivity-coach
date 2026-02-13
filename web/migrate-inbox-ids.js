import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateInboxIds() {
    const dataPath = path.join(__dirname, '..', 'coach-data.json');

    // Read current data
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));

    // Add IDs to work inbox items if they don't have one
    data.inbox.work = data.inbox.work.map((item, index) => {
        if (!item.id) {
            return {
                id: `inbox-work-${Date.now() + index}`,
                ...item
            };
        }
        return item;
    });

    // Add IDs to personal inbox items if they don't have one
    data.inbox.personal = data.inbox.personal.map((item, index) => {
        if (!item.id) {
            return {
                id: `inbox-personal-${Date.now() + index}`,
                ...item
            };
        }
        return item;
    });

    // Write back
    await fs.writeFile(dataPath, JSON.stringify(data, null, 4), 'utf8');

    console.log('✅ Migration complete!');
    console.log(`   - Work items: ${data.inbox.work.length} (all have IDs now)`);
    console.log(`   - Personal items: ${data.inbox.personal.length} (all have IDs now)`);
}

migrateInboxIds().catch(console.error);
