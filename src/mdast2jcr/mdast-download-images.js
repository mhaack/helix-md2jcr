/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-disable no-param-reassign */
import crypto from 'crypto';
import { context as fetchAPI, h1 } from '@adobe/fetch';
import processQueue from '@adobe/helix-shared-process-queue';
import { visit } from 'unist-util-visit';
import getDimensions from 'image-size';
import mime from 'mime';

function createFetchContext() {
  return process.env.HELIX_FETCH_FORCE_HTTP1
    ? h1()
    : fetchAPI();
}

function hsize(bytes, decimals = 2) {
  if (bytes === 0) {
    return '0   ';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['  ', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * @param ctx
 * @param tree
 * @returns {Promise<void>}
 */
export default async function downloadImages(ctx, tree) {
  const { log, resourceLoader, image2png } = ctx;
  const context = createFetchContext();
  const { fetch } = context;

  // gather all image nodes
  const images = [];
  visit(tree, (node) => {
    if (node.type === 'image' && node.url) {
      images.push(node);
    }
    return visit.CONTINUE;
  });
  let count = 0;

  // download images
  await processQueue(images, async (node) => {
    try {
      const ref = crypto.createHash('sha1')
        .update(node.url)
        .digest('hex');
      node.data = ctx.images[ref];
      if (node.data) {
        return;
      }
      const idx = String(count).padStart(2, ' ');
      count += 1;
      let buffer;
      let type = 'application/octet-stream';
      let maybeConvert;
      let dimensions = {
        width: 100,
        height: 100,
      };
      if (node.url.startsWith('data:')) {
        const [prefix, data] = node.url.substring(5).split(',');
        const [typ, enc] = prefix.split(';');
        if (enc !== 'base64') {
          log.warn(`[${idx}] Error decoding data url. unknown encoding: ${enc}`);
          return;
        }
        buffer = Buffer.from(data, 'base64');
        type = typ;
      } else {
        log.info(`[${idx}] GET ${node.url}`);

        let doFetch = fetch;
        if (node.url.startsWith('res:')) {
          if (!resourceLoader) {
            log.warn(`[${idx}] Error loading image ${node.url}. resource loader missing.`);
            return;
          }
          doFetch = resourceLoader.fetch.bind(resourceLoader);
        }

        const ret = await doFetch(node.url);
        if (!ret.ok) {
          const text = await ret.text();
          log.error(`[${idx}] ${ret.status} ${text}`);
          return;
        }
        buffer = await ret.buffer();
        type = ret.headers.get('content-type');
        log.info(`[${idx}] ${ret.status} ${hsize(buffer.length).padStart(10)} ${type}`);
      }

      try {
        dimensions = getDimensions(buffer);
        type = mime.getType(dimensions.type);
      } catch (e) {
        maybeConvert = true;
        log.warn(`[${idx}] Error detecting dimensions: ${e} ${type}`);
      }

      if (!maybeConvert) {
        // only convert unknown and images
        maybeConvert = type === 'application/octet-stream'
          || (type.startsWith('image/') && type !== 'image/png' && type !== 'image/jpg' && type !== 'image/jpeg' && type !== 'image/gif');
      }

      let originalBuffer;
      let originalType;
      if (maybeConvert && image2png) {
        try {
          const result = await image2png({
            src: node.url,
            data: buffer,
            type,
          });
          if (result) {
            originalBuffer = buffer;
            originalType = type;
            buffer = result.data;
            type = result.type;
            dimensions = {
              width: result.width,
              height: result.height,
            };
          }
        } catch (e) {
          log.warn(`[${idx}] Error to convert to png`, e);
        }
      }

      const ext = mime.getExtension(type);

      node.data = {
        ext,
        key: `${ref}.${ext}`,
        buffer,
        originalBuffer,
        type,
        originalType,
        dimensions,
      };
      ctx.images[ref] = node.data;
    } catch (error) {
      log.error(`Cannot download image ${node.url}: ${error.message}`);
    }
  }, 8);

  // reset fetch context
  context.reset();
}
