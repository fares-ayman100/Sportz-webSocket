const express = require('express');
const { desc, eq } = require('drizzle-orm');
const { db } = require('../db/db.js');
const { commentary } = require('../db/schema.js');
const { matchIdParamSchema } = require('../validation/matches.js');
const {
  createCommentarySchema,
  listCommentaryQuerySchema,
} = require('../validation/commentary.js');

const router = express.Router({ mergeParams: true });

const MAX_LIMIT = 100;
router.get('/', async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({
      error: 'Invalid MatchID',
      details: paramsResult.error.issues,
    });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: queryResult.error.issues,
    });
  }

  try {
    const { id: matchId } = paramsResult.data;
    const { limit = 10 } = queryResult.data;
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, paramsResult.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Failed to list commentary', error);
    return res.status(500).json({
      error: 'Failed to list commentary',
    });
  }
});

router.post('/', async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({
      error: 'Invalid MatchID',
      details: paramsResult.error.issues,
    });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: bodyResult.error.issues,
    });
  }

  try {
    const [result] = await db
      .insert(commentary)
      .values({
        matchId: paramsResult.data.id,
        ...bodyResult.data,
        metadata: bodyResult.data.metadata ?? null,
        tags: bodyResult.data.tags ?? null,
      })
      .returning();

    if (typeof res.app.locals.broadcastCommentary === 'function') {
      try {
        res.app.locals.broadcastCommentary(result.matchId, result);
      } catch (broadcastErr) {
        console.error(
          'Failed to broadcast commentary event',
          broadcastErr,
        );
      }
    }

  return res.status(201).json({data: result});
  } catch (error) {
    console.error('Failed to create commentary', error);
    return res.status(500).json({
      error: 'Failed to create commentary',
    });
  }
});

module.exports = router;
