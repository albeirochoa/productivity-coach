import dotenv from 'dotenv';
import { createApp } from './server/app.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📦 Using unified tasks-data.json');
});
