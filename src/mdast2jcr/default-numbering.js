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
import { AlignmentType, convertMillimetersToTwip, LevelFormat } from 'docx';

function createLevels() {
  const levels = [];
  const formats = [
    LevelFormat.DECIMAL,
    LevelFormat.LOWER_LETTER,
    LevelFormat.LOWER_ROMAN,
  ];
  const sfx = [
    '.',
    '',
    '',
  ];
  for (let level = 0; level < 6; level += 1) {
    levels.push({
      level,
      format: formats[level % 3],
      text: `%${level + 1}${sfx[level % 3]}`,
      alignment: AlignmentType.START,
      style: {
        paragraph: {
          indent: {
            left: convertMillimetersToTwip(10 * (level + 1)),
            hanging: convertMillimetersToTwip(5),
          },
        },
      },
    });
  }
  return levels;
}

function createBulletLevels() {
  const levels = [];
  for (let level = 0; level < 6; level += 1) {
    levels.push({
      level,
      format: LevelFormat.BULLET,
      text: '-',
      alignment: AlignmentType.START,
      style: {
        paragraph: {
          indent: {
            left: convertMillimetersToTwip(5 * (level + 1)),
            hanging: convertMillimetersToTwip(5),
          },
        },
      },
    });
  }
  return levels;
}

export default {
  config: [
    {
      reference: 'default-numbering',
      levels: createLevels(),
    },
    {
      reference: 'default-bullets',
      levels: createBulletLevels(),
    },
  ],
};
