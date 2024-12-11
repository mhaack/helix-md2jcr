/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import assert from 'assert';
import md2jcr from '../src/md2jcr/index.js';

export async function test(spec, params) {
  const md = await readFile(resolve(__testdir, 'fixtures', `${spec}.md`), 'utf-8');
  const actual = await md2jcr(md, { ...params });
  const expected = await readFile(resolve(__testdir, 'fixtures', `${spec}.xml`), 'utf-8');
  assert.strictEqual(actual.trim(), expected.trim());
}
