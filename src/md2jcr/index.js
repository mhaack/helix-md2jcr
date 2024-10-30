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
import { unified } from 'unified';
import remark from 'remark-parse';
import gfm from 'remark-gfm';
import { dereference } from '@adobe/helix-markdown-support';
import { remarkMatter } from '@adobe/helix-markdown-support/matter';
import remarkGridTable from '@adobe/remark-gridtables';
import mdast2jcr from '../mdast2jcr/index.js';

/**
 * Convert markdown to JCR XML.
 * @param md {string} The markdown content.
 * @param opts {Mdast2JCROptions} Options.
 * @return {Promise<String>} The JCR XML.
 */
export default async function md2jcr(md, opts) {
  const mdast = unified()
    .use(remark, { position: false })
    .use(gfm)
    .use(remarkMatter)
    .use(remarkGridTable)
    .parse(md);

  dereference(mdast);
  return mdast2jcr(mdast, opts);
}
