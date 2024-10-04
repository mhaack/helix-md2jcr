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

/* eslint-disable no-param-reassign */

import { inspect } from 'util';

/**
 * Splits the sections in the mdast tree
 * @type PipelineStep
 * @param {PipelineState} state
 */
export function splitSection(mdast) {
  // filter all children that are break blocks
  const dividers = mdast.children
    .filter((node) => node.type === 'thematicBreak')
    // then get their index in the list of children
    .map((node) => mdast.children.indexOf(node));

  // find pairwise permutations of spaces between blocks
  // include the very start and end of the document
  const starts = [0, ...dividers];
  const ends = [...dividers, mdast.children.length];

  // content.mdast.children = _.zip(starts, ends)
  mdast.children = starts
    .map((k, i) => [k, ends[i]])
    // but filter out empty section
    .filter(([start, end]) => start !== end)
    // then return all nodes that are in between
    .map(([start, end]) => {
      // skip 'thematicBreak' nodes
      const index = mdast.children[start].type === 'thematicBreak' ? start + 1 : start;
      return {
        type: 'section',
        children: mdast.children.slice(index, end),
      };
    });

  // unwrap sole section directly on the root
  // if (mdast.children.length === 1 && mdast.children[0].type === 'section') {
  //   mdast.children = mdast.children[0].children;
  // }

  return mdast;
}

export function wrapParagraphs(mdast) {
  const sections = mdast.children.filter((node) => node.type === 'section');

  sections.forEach((section) => {
    const { children } = section;
    const newChildren = [];
    let paragraphGroup = [];

    // process.stdout.write('==================================================\n');
    // process.stdout.write(inspect(section));
    // process.stdout.write('\n');
    // process.stdout.write('==================================================\n');

    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];

      // Group paragraph and heading (depth >= 3) into the same paragraphWrapper
      if (
        node.type === 'paragraph' ||
        node.type === 'list' ||
        node.type === 'code' ||
        (node.type === 'heading' && node.depth >= 3)
      ) {
        paragraphGroup.push(node);

        if (i === children.length - 1) {
          newChildren.push({
            type: 'paragraphWrapper',
            children: paragraphGroup,
          });
        }
      } else {
        if (paragraphGroup.length > 0) {
          newChildren.push({
            type: 'paragraphWrapper',
            children: paragraphGroup,
          });
          paragraphGroup = [];
        }
        newChildren.push(node);
      }
    }
    section.children = newChildren;

    // process.stdout.write('==================================================\n');
    // process.stdout.write(inspect(section));
    // process.stdout.write('\n');
    // process.stdout.write('==================================================\n');
  });
  return mdast;
}

export function unwrapImages(mdast) {
  const sections = mdast.children.filter((node) => node.type === 'section');

  sections.forEach((section) => {
    const newChildren = [];

    for (const node of section.children) {
      if (node.type === 'paragraph') {
        let currentText = [];
        const images = [];

        // Handle single child unwrapping for `link`, `strong`, and `em`
        if (node.children.length === 1) {
          const onlyChild = node.children[0];
          if (['link', 'strong', 'emphasis'].includes(onlyChild.type)) {
            // Move the single child outside the paragraph
            newChildren.push(onlyChild);
            // eslint-disable-next-line no-continue
            continue; // Skip further processing of this paragraph node
          }
        }

        process.stdout.write('==================================================\n');
        process.stdout.write(inspect(node));
        process.stdout.write('\n');
        process.stdout.write('==================================================\n');


        // Traverse paragraph children to separate images and text nodes
        for (let i = 0; i < node.children.length; i += 1) {
          const child = node.children[i];

          if (child.type === 'image') {
            // If we have accumulated text, push it as a paragraph before the image
            if (currentText.length > 0) {
              newChildren.push({
                type: 'paragraph',
                children: currentText,
                position: node.position,
              });
              currentText = [];
            }
            // Push the image outside the paragraph
            images.push(child);
          } else {
            // Collect non-image children as part of the paragraph
            currentText.push(child);
          }
        }

        // If there are remaining text nodes, add them as a paragraph
        if (currentText.length > 0) {
          newChildren.push({
            type: 'paragraph',
            children: currentText,
            position: node.position,
          });
        }

        // Move all images to their proper position in the parent tree
        newChildren.push(...images);
      } else {
        // Non-paragraph nodes stay as they are
        newChildren.push(node);
      }
    }

    section.children = newChildren;
  });
  return mdast;
}
