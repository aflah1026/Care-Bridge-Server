const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

const verifyAccess = async (childId, userId) => {
    const child = await pool.query(
        `SELECT c.* FROM children c
         LEFT JOIN mentor_clients mc ON c.user_id = mc.parent_id
         WHERE c.child_id = $1 AND (c.user_id = $2 OR (mc.mentor_id = $2 AND mc.status = 'active'))`,
        [childId, userId]
    );
    return child.rows.length > 0;
};

router.get("/weekly/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;
        const allowed = await verifyAccess(childId, req.user.id);
        if (!allowed) {
            return res.status(403).json("Not Authorized");
        }

        const speechSummary = await pool.query(
            `SELECT COUNT(*)::int as sessions, COALESCE(SUM(minutes),0)::int as minutes
             FROM speech_logs
             WHERE child_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
            [childId]
        );

        const speechTop = await pool.query(
            `SELECT activity_name, COUNT(*)::int as count
             FROM speech_logs
             WHERE child_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
             GROUP BY activity_name
             ORDER BY count DESC
             LIMIT 5`,
            [childId]
        );

        const activitySummary = await pool.query(
            `SELECT COUNT(*)::int as total,
                    COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
                    ROUND(AVG(rating)::numeric, 2) as avg_rating
             FROM activities
             WHERE child_id = $1 AND scheduled_time >= NOW() - INTERVAL '7 days'`,
            [childId]
        );

        const latestObservation = await pool.query(
            `SELECT * FROM daily_observations
             WHERE child_id = $1
             ORDER BY observed_at DESC
             LIMIT 1`,
            [childId]
        );

        const moodBreakdown = await pool.query(
            `SELECT mood, COUNT(*)::int as count
             FROM daily_observations
             WHERE child_id = $1 AND observed_at >= NOW() - INTERVAL '7 days'
             GROUP BY mood`,
            [childId]
        );

        const sleepBreakdown = await pool.query(
            `SELECT sleep_quality, COUNT(*)::int as count
             FROM daily_observations
             WHERE child_id = $1 AND observed_at >= NOW() - INTERVAL '7 days'
             GROUP BY sleep_quality`,
            [childId]
        );

        const appetiteBreakdown = await pool.query(
            `SELECT appetite_level, COUNT(*)::int as count
             FROM daily_observations
             WHERE child_id = $1 AND observed_at >= NOW() - INTERVAL '7 days'
             GROUP BY appetite_level`,
            [childId]
        );

        res.json({
            range_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            range_end: new Date(),
            speech: {
                sessions: speechSummary.rows[0]?.sessions || 0,
                minutes: speechSummary.rows[0]?.minutes || 0,
                top_activities: speechTop.rows
            },
            activities: {
                total: activitySummary.rows[0]?.total || 0,
                completed: activitySummary.rows[0]?.completed || 0,
                avg_rating: activitySummary.rows[0]?.avg_rating || null
            },
            observations: {
                latest: latestObservation.rows[0] || null,
                mood_breakdown: moodBreakdown.rows,
                sleep_breakdown: sleepBreakdown.rows,
                appetite_breakdown: appetiteBreakdown.rows
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
