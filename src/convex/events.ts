import { mutation, query, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const create = mutation({
  args: {
    title: v.string(),
    days: v.array(v.string()),
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('events', args);
    await ctx.scheduler.runAfter(THIRTY_DAYS_MS, internal.events.expire, { id });
    return id;
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    try {
      return await ctx.db.get(id as Id<'events'>);
    } catch {
      return null;
    }
  },
});

export const expire = internalMutation({
  args: { id: v.id('events') },
  handler: async (ctx, { id }) => {
    const responses = await ctx.db
      .query('responses')
      .withIndex('by_event', q => q.eq('eventId', id))
      .collect();
    for (const r of responses) await ctx.db.delete(r._id);
    await ctx.db.delete(id);
  },
});
