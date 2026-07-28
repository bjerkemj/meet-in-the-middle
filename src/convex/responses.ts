import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

export const save = mutation({
  args: {
    eventId: v.string(),
    name: v.string(),
    slots: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = args.eventId as Id<'events'>;
    const existing = await ctx.db
      .query('responses')
      .withIndex('by_event', q => q.eq('eventId', eventId))
      .collect();
    const dup = existing.find(r => r.name === args.name);
    if (dup) await ctx.db.delete(dup._id);
    return await ctx.db.insert('responses', { eventId, name: args.name, slots: args.slots });
  },
});

export const list = query({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    try {
      return await ctx.db
        .query('responses')
        .withIndex('by_event', q => q.eq('eventId', eventId as Id<'events'>))
        .collect();
    } catch {
      return [];
    }
  },
});
