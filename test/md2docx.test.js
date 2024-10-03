/*
 * Copyright 2021 Adobe. All rights reserved.
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
import path from 'path';
import fs from 'node:fs/promises';
import assert from 'assert';
import { fileURLToPath } from 'url';
import yauzl from 'yauzl';
import { MediaHandler } from '@adobe/helix-mediahandler';
import { docx2md } from '@adobe/helix-docx2md';
import { Response } from '@adobe/fetch';

import nock from 'nock';

// import inspect from 'unist-util-inspect';

import md2docx from '../src/md2docx/index.js';

// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BLANK_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNMcU6pBwADqgGMdo0D1wAAAABJRU5ErkJggg==';

class MockMediaHandler extends MediaHandler {
  constructor(params) {
    super({
      owner: 'owner',
      repo: 'repo',
      ref: 'ref',
      contentBusId: 'dummyId',
      ...params,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async checkBlobExists() {
    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  async getBlob(uri) {
    return {
      contentType: 'image/png',
      uri,
      meta: {
        width: '32',
        height: '32',
      },
    };
  }
}

async function svg2png(opts) {
  // transparent 1x1 png
  assert.strictEqual(opts.type, 'image/svg+xml');
  return {
    type: 'image/png',
    width: 1,
    height: 1,
    data: Buffer.from(BLANK_PNG, 'base64'),
  };
}

async function avif2png(opts) {
  // transparent 1x1 png
  assert.strictEqual(opts.type, 'image/avif');
  return {
    type: 'image/png',
    width: 1,
    height: 1,
    data: Buffer.from(BLANK_PNG, 'base64'),
  };
}

async function test(spec, opts = {}, docx2mdOpts = {}) {
  const md = await fs.readFile(path.resolve(__dirname, 'fixtures', `${spec}.md`), 'utf-8');
  let mdExpected = md;
  try {
    mdExpected = await fs.readFile(path.resolve(__dirname, 'fixtures', `${spec}.expected.md`), 'utf-8');
  } catch (e) {
    // ignore
  }

  const buffer = await md2docx(md, opts);
  await fs.writeFile(path.resolve(__dirname, 'tmp', `${spec}.docx`), buffer);

  // convert back
  const actual = await docx2md(buffer, {
    mediaHandler: new MockMediaHandler(),
    ...docx2mdOpts,
  });
  assert.strictEqual(actual, mdExpected);
}

describe('Markdown to docx converter', () => {
  before(async () => {
    await fs.mkdir(path.resolve(__dirname, 'tmp'), { recursive: true });
  });

  it.skip('converts a simple markdown correctly', async () => {
    await test('styling-test');
  });

  it.skip('converts a simple markdown correctly (blob)', async () => {
    await test('styling-test-blob');
  });

  it('converts html in tables', async () => {
    await test('tables');
  });

  it('converts html in grid tables', async () => {
    const scope = nock('https://www.example.com')
      .get('/300.png')
      .replyWithFile(200, path.resolve(__dirname, 'fixtures', 'test-300.png'), {
        'content-type': 'image/png',
      });
    await test('gridtables', {}, { gridtables: true });
    await scope.done();
  });

  it('embeds svgs', async () => {
    await test('svg', {
      image2png: svg2png,
    });
  });

  it('handle data urls in images', async () => {
    await test('img-data-url');
  });

  it.skip('ordered lists', async () => {
    await test('broken-ordered-list');
  });

  it('bold links', async () => {
    await test('bold-links');
  });

  it('more links', async () => {
    await test('links');
  });

  it('anchors', async () => {
    await test('anchors');
  });

  it('bookmarks', async () => {
    await test('bookmarks');
  });

  it('image title', async () => {
    await test('img-title');
  });

  it('breaks', async () => {
    await test('breaks');
  });

  it.skip('italic_links', async () => {
    await test('italic_links');
  });

  it.skip('image_links', async () => {
    await test('image_links');
  });

  it.skip('blockquote', async () => {
    await test('blockquote');
  });

  it('simple', async () => {
    await test('simple');
  });

  it('html flow with newlines', async () => {
    await test('htmlflow-with-newlines');
  });

  it('underline with bold', async () => {
    await test('underline-with-bold');
  });

  it('table cell alignment', async () => {
    await test('cell-alignment', {}, { gridtables: true });
  });

  it('test avif images', async () => {
    const scope = nock('https://example.com')
      .get('/test-300.avif')
      .replyWithFile(200, path.resolve(__dirname, 'fixtures', 'test-300.avif'), {
        'content-type': 'image/avif',
      })
      .get('/test-300.png')
      .replyWithFile(200, path.resolve(__dirname, 'fixtures', 'test-300.png'), {
        'content-type': 'image/png',
      })
      .get('/fake.mp4')
      .reply(200, '', {
        'content-type': 'video/mp4',
      })
      .get('/null.jpg.bin.jpg')
      .replyWithFile(200, path.resolve(__dirname, 'fixtures', 'test-300.png'), {
        'content-type': 'application/octet-stream',
      });
    await test('avif', {
      image2png: avif2png,
    });
    await scope.done();
  });

  it('test resource loader', async () => {
    await test('resource-loader', {
      resourceLoader: {
        fetch: (url) => {
          if (url === 'res:notfound') {
            return new Response('', {
              status: 404,
            });
          }
          assert.strictEqual(url, 'res:300.png');
          return new Response(Buffer.from(BLANK_PNG, 'base64'), {
            headers: {
              'content-type': 'image/png',
            },
          });
        },
      },
    });
  });

  it.skip('converts a complex markdown correctly)', async () => {
    await test('number');
  }).timeout(10000);

  it('custom styles', async () => {
    const spec = 'simple';
    const md = await fs.readFile(path.resolve(__dirname, 'fixtures', `${spec}.md`), 'utf-8');
    const customStylesXML = await fs.readFile(path.resolve(__dirname, 'fixtures', 'custom-styles.xml'), 'utf-8');

    const customStyleDocx = await md2docx(md, {
      stylesXML: customStylesXML,
    });
    const defaultStyleDocx = await md2docx(md);

    const getStyleFromDocx = async (buffer) => new Promise((resolve) => {
      yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (entry.fileName === 'word/styles.xml') {
            zipfile.openReadStream(entry, (e, readStream) => {
              let content = '';
              readStream.on('end', () => {
                resolve(content);
              });
              readStream.on('data', (data) => {
                content += data.toString();
              });
            });
          } else {
            zipfile.readEntry();
          }
        });
      });
    });

    // validate style with override
    const customStyle = await getStyleFromDocx(customStyleDocx);
    assert.ok(customStyle.indexOf('Verdana') > -1);
    assert.ok(customStyle.indexOf('Arial') === -1);

    // validate style without override
    const defaultStyle = await getStyleFromDocx(defaultStyleDocx);
    assert.ok(defaultStyle.indexOf('Verdana') === -1);
    assert.ok(defaultStyle.indexOf('Arial') > -1);

    // convert back
    const actual = await docx2md(customStyleDocx, {
      mediaHandler: new MockMediaHandler(),
    });
    assert.strictEqual(actual, md);
  });
});
