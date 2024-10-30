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
import image from './image.js';
import link from './link.js';
import text from './text.js';

/**
 * List of handlers that will be used to convert mdast nodes to JCR nodes.
 * @type {{getProperties: (function(*): {src: *, alt: *}), supports: (function(*): boolean)}[]}
 */
const handlers = {
  image,
  link,
  text,
};

export function getHandler(child) {
  const [name, handler] = Object.entries(handlers).find(([, entry]) => entry.supports(child)) || [];
  if (name) {
    return { name, ...handler };
  }
  return undefined;
}
