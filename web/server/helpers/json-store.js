import { promises as fs } from 'fs';
import path from 'path';

export function createJsonStore(dataRoot) {
    async function readJson(filename) {
        const data = await fs.readFile(path.join(dataRoot, filename), 'utf8');
        return JSON.parse(data);
    }

    async function writeJson(filename, data) {
        await fs.writeFile(path.join(dataRoot, filename), JSON.stringify(data, null, 4), 'utf8');
    }

    return {
        readJson,
        writeJson
    };
}
