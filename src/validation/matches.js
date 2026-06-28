'use strict';
const { z } = require('zod');

const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createMatchSchema = z
  .object({
    sport: z.string().min(1),
    homeTeam: z.string().min(1),
    awayTeam: z.string().min(1),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    const s = Date.parse(data.startTime);
    const e = Date.parse(data.endTime);
    if (Number.isNaN(s) || Number.isNaN(e)) return;
    if (e <= s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be after startTime',
      });
    }
  });

const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});

module.exports = {
  listMatchesQuerySchema,
  MATCH_STATUS,
  matchIdParamSchema,
  createMatchSchema,
  updateScoreSchema,
};
