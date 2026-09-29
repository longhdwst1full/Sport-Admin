import { describe, expect, it } from 'vitest';
import { SystemParameterGroup } from '@/generated/api/system/system.schemas';
import { parameterGroupLabels } from './system-parameter.constants';

describe('parameterGroupLabels', () => {
  it.each(Object.values(SystemParameterGroup))('has a non-empty label for %s', (group) => {
    expect(parameterGroupLabels[group]?.trim()).toBeTruthy();
  });
});
