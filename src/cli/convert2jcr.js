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

/* eslint-disable no-await-in-loop,no-console */
import {
  readdir, readFile, stat, writeFile,
} from 'fs/promises';
import path from 'path';
import { md2jcr } from '../index.js';

async function run(filePath) {
  // eslint-disable-next-line no-param-reassign
  filePath = path.resolve(process.cwd(), filePath);
  const files = [];
  if ((await stat(filePath)).isDirectory()) {
    files.push(...await readdir(filePath));
  } else {
    files.push(filePath);
  }

  for (const file of files) {
    if (!file.endsWith('.md')) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const dir = path.dirname(file);
    const base = path.basename(file, '.md');
    const fileJcrXML = path.resolve(dir, `${base}.xml`);

    console.log(`converting ${file} -> ${path.relative(process.cwd(), fileJcrXML)}`);

    const md = await readFile(file);
    const buffer = await md2jcr(md);
    await writeFile(fileJcrXML, buffer);
  }
}

run(process.argv[2] || process.cwd()).catch(console.error);
