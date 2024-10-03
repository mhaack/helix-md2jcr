/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { slug } from 'github-slugger';

class GHSlugger {
  constructor() {
    this.occurrences = {};
  }

  /**
   * Generate a unique slug.
   * @param  {string} value String of text to slugify
   * @return {string}       A unique slug string
   */
  slug(value) {
    let id = slug(value)
      // remove leading numbers
      .replace(/^\d+-+/, '');

    // resolve collisions
    const original = id;
    while (id in this.occurrences) {
      this.occurrences[original] += 1;
      id = `${original}-${this.occurrences[original]}`;
    }
    this.occurrences[id] = 0;
    return id;
  }
}

export function buildAnchors(tree) {
  const tracking = {};
  const slugger = new GHSlugger();

  const track = (url) => {
    let ref = tracking[url];
    if (!ref) {
      ref = { links: [], heading: null, bookmark: null };
      tracking[url] = ref;
    }
    return ref;
  };

  visit(tree, (node) => {
    if (node.type === 'link' && node.url.startsWith('#')) {
      const ref = track(node.url);
      ref.links.push(node);
      // special case: link to top of page
      if (node.url === '#') {
        // eslint-disable-next-line no-param-reassign
        node.anchor = '_top';
      }
    } else if (node.type === 'link' && node.anchor) {
      // eslint-disable-next-line no-param-reassign
      node.type = 'bookmark';
      track(`#${node.anchor}`).bookmark = node;
    } else if (node.type === 'heading') {
      const anchor = `#${slugger.slug(toString(node))}`;
      track(anchor).heading = node;
    }
    return visit.CONTINUE;
  });

  const anchors = {};
  Object.keys(tracking).forEach((k) => {
    const ref = tracking[k];
    if (ref.heading) {
      // ms-word heading bookmark algorithm
      const words = toString(ref.heading).split(/\s+/).slice(0, 3);
      let anchor = `_${words.join('_')}`.substring(0, 36);

      // resolve collisions
      const original = anchor;
      while (anchor in anchors) {
        anchors[original] += 1;
        anchor = `${original}${anchors[original]}`;
      }
      anchors[anchor] = 0;

      ref.heading.anchor = anchor;
      for (const link of ref.links) {
        link.anchor = anchor;
      }
    } else if (ref.bookmark) {
      const { anchor } = ref.bookmark;
      for (const link of ref.links) {
        link.anchor = anchor;
      }
    } else if (k.startsWith('#') && k !== '#') {
      // broken anchor link
      for (const link of ref.links) {
        link.anchor = k.substring(1);
      }
    }
  });
}
