/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {RequestOptions, Response} from "@adobe/helix-fetch";

declare interface ImageToPngOptions {
  /**
   * image data
   */
  data:Buffer|ArrayBuffer;
  /**
   * informational src information
   */
  src?:string;
  /**
   * image content type, if available.
   */
  type?:string;
}

declare interface ImageToPngResult {
  data:Buffer|ArrayBuffer;
  type?:string;
  width:number;
  height:number;
}

declare type ImageToPngConverter = (opts:ImageToPngOptions) => Promise<ImageToPngResult>;

/**
 * Loader used for loading resources for urls starting with `res:`
 */
declare interface ResourceLoader {
  fetch(url:string, opts:RequestOptions): Promise<Response>
}

declare interface Mdast2JCROptions {
  /**
   * A console like logger
   */
  log: Console;

  /**
   * The content of the styles.xml file of a Word template (to override provided default)
   */
  stylesXML: string;

  /**
   * Optional loader for (image) resources
   */
  resourceLoader?:ResourceLoader;

  /**
   * Optional image2png converter
   */
  image2png?: ImageToPngConverter
}

/**
 * Converts the mdast to a word document (docx).
 *
 * @param {Node} mdast The mdast
 * @param {Mdast2JCROptions} [opts] options
 * @returns {Promise<Buffer>} the docx
 */
export default function mdast2jcr(mdast: object, opts?: Mdast2JCROptions): Promise<Buffer>;
