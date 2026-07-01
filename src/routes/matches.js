const express = require('express');
const { db } = require('../db/db.js');
const { matches } = require('../db/schema.js');
const { getMatchStatus } = require('../utils/match-status.js');
const {
  createMatchSchema,
  listMatchesQuerySchema,
} = require('../validation/matches.js');
const commentaryRouter = require('./commentary');
const { desc } = require('drizzle-orm');
const router = express.Router();

const MAX_LIMIT = 100;

router.use('/:id/commentary', commentaryRouter);
router.get('/', async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid query',
      details: parsed.error.issues,
    });
  }

  try {
    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(500).json({
      error: 'Failed to list matches',
    });
  }
});

router.post('/', async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parsed.error.issues,
    });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();
      if (typeof res.app.locals.broadcastMatchCreated === 'function') {
        try {
          res.app.locals.broadcastMatchCreated(event);
        } catch (broadcastErr) {
          console.error(
            'Failed to broadcast match_created event',
            broadcastErr,
          );
        }
      }

    res.status(201).json(event);
  } catch (e) {
    console.error('Failed to create match', e);
    return res.status(500).json({
      error: 'Failed to create match',
    });
  }
});
module.exports = router;
