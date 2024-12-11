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
import { loadBlockResources } from './test.utils.js';
import { test } from './test-base.js';

async function testBlock(spec) {
  const { models, definition, filters } = await loadBlockResources(spec);
  await test(`blocks/${spec}/${spec}`, { models, definition, filters });
}

describe('md2jcr Tests', () => {
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
