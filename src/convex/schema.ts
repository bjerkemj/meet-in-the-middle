import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  events: defineTable({
    title: v.string(),
    days: v.array(v.string()),
    from: v.string(),
    to: v.string(),
  }),
  responses: defineTable({
    eventId: v.id('events'),
    name: v.string(),
    slots: v.array(v.string()),
  }).index('by_event', ['eventId']),
});
