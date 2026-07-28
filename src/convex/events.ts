import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

export const create = mutation({
  args: {
    title: v.string(),
    days: v.array(v.string()),
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('events', args);
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
