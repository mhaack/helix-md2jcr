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
import { visit } from 'unist-util-visit';
import { unified } from 'unified';
import parse from 'rehype-parse';
import { defaultHandlers, toMdast } from 'hast-util-to-mdast';
import tableHandler from './hast-table-handler.js';
import tableCellHandler from './hast-table-cell-handler.js';

/**
 * Creates simple format handler
 * @param type
 */
function formatHandler(type) {
  return (state, node) => {
    const result = { type, children: state.all(node) };
    state.patch(node, result);
    return result;
  };
}

/**
 * @param {State} state
 *   State.
 * @param {Readonly<Element>} node
 *   hast element to transform.
 * @returns {Link}
 *   mdast node.
 */
export function linkHandler(state, node) {
  const properties = node.properties || {};
  // Allow potentially “invalid” nodes, they might be unknown.
  // We also support straddling later.
  const children = /** @type {Array<PhrasingContent>} */ (state.all(node));

  /** @type {Link} */
  const result = {
    type: 'link',
    url: state.resolve(String(properties.href || '') || null),
    title: properties.title ? String(properties.title) : null,
    anchor: properties.name ?? properties.id,

    // if the link has a child of type link, then we need to unwrap it
    children: children.length === 1 && children[0].type === 'link' ? children[0].children : children,
  };
  state.patch(node, result);
  return result;
}

/**
 * removes paragraphs from the child nodes recursively.
 * @param  node
 */
function unwrapParagraphs(node) {
  if (!node.children) {
    return node;
  }
  for (let idx = 0; idx < node.children.length; idx += 1) {
    const child = node.children[idx];
    if (child.type === 'paragraph') {
      node.children.splice(idx, 1, ...child.children);
      idx += child.children.length - 1;
    } else {
      // eslint-disable-next-line no-param-reassign
      node.children[idx] = unwrapParagraphs(child);
    }
  }
  return node;
}

/**
 * Handler for `<markdown>` elements.
 * @param {[]} mdasts array of mdast sub trees
 */
function mdHandler(mdasts) {
  return (state, node) => {
    // given the index property from the <markdown idx> element, return the
    // corresponding mdast sub tree from the mdasts array.
    const { idx } = node.properties;
    return mdasts[+idx];
  };
}

function isPhrasingParent(node) {
  return [
    'paragraph',
    'underline',
    'subscript',
    'superscript',
    'heading',
    'emphasis',
    'strong',
    'link',
    'linkReference',
    'tableCell',
    'delete',
    'footnote',
  ].includes(node.type);
}

/**
 * Find the index of the last HTML node in the list of siblings, if no HTML node
 * is found, return an index of 0;
 * @param siblings list of siblings to search through to find the last HTML node
 * @returns {number}
 */
export function locateIndexOfLastHtmlNode(siblings) {
  const index = [...siblings]
    .reverse()
    .findIndex((sibling) => sibling.type === 'html');

  // restore the order of the siblings array before returning the index
  return index === -1 ? 0 : siblings.length - index - 1;
}

/**
 * Sanitizes html:
 * - collapses consecutive html content (simply concat all nodes until the last html sibling)
 * - parses and converts them to mdast again
 *
 * @param {object} tree
 * @returns {object} The modified (original) tree.
 */
export default function sanitizeHtml(tree) {
  const mdInserts = [];

  visit(tree, (node, index, parent) => {
    const { children: siblings = [] } = parent || {};

    // collapse html blocks
    if (node.type === 'html') {
      // find the index of the last html node in the list of siblings
      const lastHtmlIndex = locateIndexOfLastHtmlNode(siblings, index);

      // get the node's value and store it in html variable
      let html = node.value;

      // if there are more html nodes after this one, remove them from the siblings array
      if (lastHtmlIndex > index) {
        // splice the siblings array to remove the nodes that are between the
        // current node and the last html node, leaving the siblings array with
        // only the nodes that come before the first HTML node, and include the
        // first HTML node
        const removed = siblings.splice(index + 1, lastHtmlIndex - index);

        // append to html as special markdown element marker which is then handled in the
        // mdHandler for the `<markdown>` elements.
        removed.forEach((n) => {
          if (n.type === 'html' || n.type === 'text') {
            html += n.value;
          } else {
            // eventually toMdast will be called, and when we encounter a markdown element
            // we need to replace it with the actual markdown content, so store the index
            // such that we can look it up in the mdInserts array later.
            html += `<markdown idx="${mdInserts.length}"></markdown>`;
            mdInserts.push(n);
          }
        });
      }

      if (isPhrasingParent(parent)) {
        html = `<p>${html}</p>`;
      }

      // try parse html
      const hast = unified()
        .use(parse, { fragment: true })
        .parse(html);

      // convert to mdast with extra handlers
      const mdast = toMdast(hast, {
        document: false,
        handlers: {
          ...defaultHandlers,
          a: linkHandler,
          u: formatHandler('underline'),
          sub: formatHandler('subscript'),
          sup: formatHandler('superscript'),
          table: tableHandler,
          markdown: mdHandler(mdInserts),
          th: tableCellHandler,
          td: tableCellHandler,
        },
      });
      // clear inserts
      mdInserts.length = 0;

      // ensure that flow nodes are in phrasing context
      if (!isPhrasingParent(parent)) {
        let lastParagraph;
        for (let idx = 0; idx < mdast.children.length; idx += 1) {
          const child = mdast.children[idx];
          if (child.type === 'underline' || child.type === 'subscript' || child.type === 'superscript') {
            unwrapParagraphs(child);
            if (!lastParagraph) {
              lastParagraph = {
                type: 'paragraph',
                children: [child],
              };
              mdast.children.splice(idx, 1, lastParagraph);
            } else {
              lastParagraph.children.push(child);
              mdast.children.splice(idx, 1);
              idx -= 1;
            }
          } else {
            lastParagraph = null;
          }
        }
      } else {
        unwrapParagraphs(mdast);
      }

      // inject children of parsed tree
      siblings.splice(index, 1, ...mdast.children);

      // continue after
      return index + mdast.children.length;
    }

    return visit.CONTINUE;
  });
  return tree;
}
