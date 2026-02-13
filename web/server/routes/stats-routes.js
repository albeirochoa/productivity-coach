export function registerStatsRoutes(app, deps) {
    const { readJson } = deps;

    // ============================================
    // STATS & PROFILE
    // ============================================

    app.get('/api/stats', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            res.json(data.stats || {});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/profile', async (req, res) => {
        try {
            const data = await readJson('profile.json');
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
