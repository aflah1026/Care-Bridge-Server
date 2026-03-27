const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

// Get activities for a child
router.get("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;

        // Check ownership or mentor connection
        const child = await pool.query(
            `SELECT c.* FROM children c
             LEFT JOIN mentor_clients mc ON c.user_id = mc.parent_id
             WHERE c.child_id = $1 AND (c.user_id = $2 OR mc.mentor_id = $2 AND mc.status = 'active')`,
            [childId, req.user.id]
        );
        if (child.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const activities = await pool.query(
            "SELECT * FROM activities WHERE child_id = $1 ORDER BY scheduled_time ASC",
            [childId]
        );
        res.json(activities.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add activity
router.post("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;
        const { title, description, activity_type, scheduled_time, recurrence, status, rating, feedback, completed_at } = req.body;

        // Check ownership or mentor connection
        const child = await pool.query(
            `SELECT c.* FROM children c
             LEFT JOIN mentor_clients mc ON c.user_id = mc.parent_id
             WHERE c.child_id = $1 AND (c.user_id = $2 OR mc.mentor_id = $2 AND mc.status = 'active')`,
            [childId, req.user.id]
        );
        if (child.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const baseInsert = async (date) => {
            const columns = ["child_id", "title", "description", "activity_type", "scheduled_time", "assigned_by"];
            const values = [childId, title, description, activity_type, date, req.user.id];

            if (status) {
                columns.push("status");
                values.push(status);
            }
            if (rating !== undefined) {
                columns.push("rating");
                values.push(rating);
            }
            if (feedback !== undefined) {
                columns.push("feedback");
                values.push(feedback);
            }
            if (completed_at) {
                columns.push("completed_at");
                values.push(completed_at);
            } else if (status === "completed") {
                columns.push("completed_at");
                values.push(new Date());
            }

            const placeholders = values.map((_, idx) => `$${idx + 1}`);
            const query = `INSERT INTO activities (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
            return pool.query(query, values);
        };

        if (recurrence && recurrence.type && recurrence.type !== 'none') {
            const occurrences = Math.min(parseInt(recurrence.count || 4, 10), 20);
            const inserted = [];
            let nextDate = new Date(scheduled_time);

            for (let i = 0; i < occurrences; i++) {
                if (i > 0) {
                    if (recurrence.type === 'daily') {
                        nextDate.setDate(nextDate.getDate() + 1);
                    } else if (recurrence.type === 'weekly') {
                        nextDate.setDate(nextDate.getDate() + 7);
                    } else if (recurrence.type === 'biweekly') {
                        nextDate.setDate(nextDate.getDate() + 14);
                    }
                }
                const result = await baseInsert(new Date(nextDate));
                inserted.push(result.rows[0]);
            }

            return res.json(inserted);
        }

        const newActivity = await baseInsert(scheduled_time);
        res.json(newActivity.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update activity (complete/rating)
router.put("/:activityId", authorize, async (req, res) => {
    try {
        const { activityId } = req.params;
        const { status, rating, feedback, scheduled_time, title, description, activity_type } = req.body;

        const fields = [];
        const queryParams = [activityId];
        let paramIndex = 2;

        if (status) {
            fields.push(`status = $${paramIndex++}`);
            queryParams.push(status);
        }
        if (rating !== undefined) {
            fields.push(`rating = $${paramIndex++}`);
            queryParams.push(rating);
        }
        if (feedback !== undefined) {
            fields.push(`feedback = $${paramIndex++}`);
            queryParams.push(feedback);
        }
        if (scheduled_time) {
            fields.push(`scheduled_time = $${paramIndex++}`);
            queryParams.push(scheduled_time);
        }
        if (title) {
            fields.push(`title = $${paramIndex++}`);
            queryParams.push(title);
        }
        if (description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            queryParams.push(description);
        }
        if (activity_type) {
            fields.push(`activity_type = $${paramIndex++}`);
            queryParams.push(activity_type);
        }

        if (status === 'completed') {
            fields.push(`completed_at = CURRENT_TIMESTAMP`);
        }

        if (fields.length === 0) {
            return res.status(400).json("No fields to update");
        }

        const updateQuery = `UPDATE activities SET ${fields.join(", ")} WHERE activity_id = $1 RETURNING *`;
        
        const updatedActivity = await pool.query(updateQuery, queryParams);
        
        if (updatedActivity.rows.length === 0) {
            return res.status(404).json("Activity not found");
        }
        
        res.json(updatedActivity.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
