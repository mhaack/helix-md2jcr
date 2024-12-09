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
/* eslint-env mocha */
import assert from 'assert';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import md2jcr from '../src/md2jcr/index.js';
import { loadBlockResources } from './test.utils.js';

async function test(spec, models, definition, filters) {
  const md = await readFile(resolve(__testdir, 'fixtures', `${spec}.md`), 'utf-8');
  const actual = await md2jcr(md, {
    log: console,
    models,
    definition,
    filters,
  });
  const expected = await readFile(resolve(__testdir, 'fixtures', `${spec}.xml`), 'utf-8');
  assert.strictEqual(actual.trim(), expected.trim());
}

async function testBlock(spec) {
  const { models, definition, filters } = await loadBlockResources(spec);
  await test(`blocks/${spec}/${spec}`, models, definition, filters);
}

describe('md2jcr Tests', () => {
  it('convert a simple md', async () => {
    await test('simple');
  });

  it('convert text paragraphs', async () => {
    await test('paragraphs');
  });

  it('converts headings', async () => {
    await test('headings');
  });

  it('converts buttons & links', async () => {
    await test('buttons');
  });

  it('converts multiple sections', async () => {
    await test('sections');
  });

  it('converts images', async () => {
    await test('images');
  });

  it('converts a document with default-content', async () => {
    await test('default-content-only');
  });

  it('test key value blocks', async () => {
    await testBlock('key-value');
  });

  it('default block test', async () => {
    await testBlock('block');
  });

  it('test field grouping in a block', async () => {
    await testBlock('grouping');
  });

  it('test for container block', async () => {
    await testBlock('container-block');
  });

  it('test for metadata block', async () => {
    await testBlock('metadata');
  });

  it('test for expanded metadata block', async () => {
    await testBlock('metadata-expanded');
  });
});
