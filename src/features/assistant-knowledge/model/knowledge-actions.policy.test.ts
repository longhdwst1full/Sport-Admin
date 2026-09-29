import { describe, expect, it } from 'vitest';
import {
  KNOWLEDGE_ERROR_CODE,
  KNOWLEDGE_STALE_ERROR_CODES,
} from '../constants/knowledge.constants';
import { availableKnowledgeActions } from './knowledge-actions.policy';

const manage = new Set(['assistant.knowledge.manage']);

describe('availableKnowledgeActions', () => {
  it.each([
    ['DRAFT', ['publish', 'archive']],
    ['PUBLISHED', ['archive']],
    ['ARCHIVED', ['publish']],
  ] as const)('%s offers %j', (status, expected) => {
    expect(availableKnowledgeActions({ status }, manage)).toEqual(expected);
  });

  it('offers nothing without the manage permission', () => {
    expect(availableKnowledgeActions({ status: 'DRAFT' }, new Set())).toEqual([]);
  });
});

describe('KNOWLEDGE_STALE_ERROR_CODES', () => {
  it('reloads on version conflict, invalid transition and not-found (gone or out of branch scope)', () => {
    expect([...KNOWLEDGE_STALE_ERROR_CODES].sort()).toEqual(
      [
        KNOWLEDGE_ERROR_CODE.VERSION_CONFLICT,
        KNOWLEDGE_ERROR_CODE.INVALID_TRANSITION,
        KNOWLEDGE_ERROR_CODE.NOT_FOUND,
      ].sort(),
    );
    expect(KNOWLEDGE_STALE_ERROR_CODES.has(KNOWLEDGE_ERROR_CODE.BRANCH_SCOPE_DENIED)).toBe(false);
    expect(KNOWLEDGE_STALE_ERROR_CODES.has(KNOWLEDGE_ERROR_CODE.ALREADY_ATTACHED)).toBe(false);
  });
});
