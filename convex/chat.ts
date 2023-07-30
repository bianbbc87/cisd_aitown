import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import {
  DatabaseReader,
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { Entry, EntryOfType } from './schema';
import { PaginationResult, paginationOptsValidator } from 'convex/server';
import { Message } from './types';

export const listConversations = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversations')
      .withIndex('by_worldId', (q) => q.eq('worldId', args.worldId))
      .order('desc')
      .collect();
  },
});

export const paginateConversations = query({
  args: { worldId: v.id('worlds'), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversations')
      .withIndex('by_worldId', (q) => q.eq('worldId', args.worldId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const paginatePlayerMessages = query({
  args: { playerId: v.id('players'), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const results = (await ctx.db
      .query('journal')
      .withIndex('by_playerId_type_ts', (q) =>
        q.eq('playerId', args.playerId).eq('data.type', 'talking'),
      )
      .order('desc')
      .paginate(args.paginationOpts)) as PaginationResult<EntryOfType<'talking'>>;
    return {
      ...results,
      page: results.page.map(clientMessage),
    };
  },
});

export const listMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const messages = (await conversationQuery(ctx.db, args.conversationId).take(
      1000,
    )) as EntryOfType<'talking'>[];
    return messages.map(clientMessage);
  },
});

export const paginateMessages = query({
  args: { conversationId: v.id('conversations'), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const messages = (await conversationQuery(ctx.db, args.conversationId).paginate(
      args.paginationOpts,
    )) as PaginationResult<EntryOfType<'talking'>>;
    return {
      ...messages,
      page: messages.page.map(clientMessage),
    };
  },
});

function conversationQuery(db: DatabaseReader, conversationId: Id<'conversations'>) {
  return db
    .query('journal')
    .withIndex('by_conversation', (q) => q.eq('data.conversationId', conversationId as any))
    .order('desc');
}

export function clientMessage(m: EntryOfType<'talking'>): Message {
  return {
    from: m.playerId,
    to: m.data.audience,
    content: m.data.content,
    ts: m.ts,
  };
}
