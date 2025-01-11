import {describe, expect, test} from '@jest/globals';
import * as git from '../src/git';

describe('Repo', () => {
  test('constructor adds empty commit', () => {
    const repo = new git.Repo("seed");
    expect(repo.head.msg).toBe("First commit");
  });
});
