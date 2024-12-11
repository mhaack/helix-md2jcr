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
import link from '../src/mdast2jcr/hb/partials/supports/image.js';

describe('Image Helper Tests', () => {
  let node;

  before(() => {
    node = { type: 'image' };
  });

  it('verify supports', () => {
    assert(link.supports(node) === true);

    node = { type: 'paragraph' };
    assert(link.supports(node) === false);
  });

  it('verify image properties', () => {
    const child = {
      type: 'image',
      url: 'https://adobe.com',
      alt: 'Adobe',
      label: 'Adobe',
    };
    const properties = link.getProperties(child);
    assert(properties.url === 'https://adobe.com');
    assert(properties.alt === 'Adobe');
    assert(properties.label === 'Adobe');
  });

  it('verify image properties with no alt and label', () => {
    const child = {
      type: 'image',
      url: 'https://adobe.com',
    };
    const properties = link.getProperties(child);
    assert(properties.url === 'https://adobe.com');
    assert(properties.alt === '');
    assert(properties.label === '');
  });

  it('verify image properties with no url', () => {
    const child = {
      type: 'image',
      alt: 'Adobe',
      label: 'Adobe',
    };
    const properties = link.getProperties(child);
    assert(properties.url === '');
    assert(properties.alt === 'Adobe');
    assert(properties.label === 'Adobe');
  });
});
