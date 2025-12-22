export const AVATAR_COLORS = [
  'bg-primary-500',
  'bg-secondary-500',
  'bg-success-500',
  'bg-warning-500',
  'bg-danger-500',
  'bg-info-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

export function getRandomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
import { createHash } from 'crypto';
import { getLinkPreview } from 'link-preview-js';
import {
  get,
  head,
  includes,
  isArray,
  isDate,
  isFunction,
  isObject,
  keys,
  map,
  reduce,
} from 'lodash';
import { Document, Types } from 'mongoose';
import { v7 } from 'uuid';

export const currentTime = () => new Date();

export const isJson = (val: unknown) => {
  try {
    if (typeof val === 'string') {
      JSON.parse(val);
    } else {
      JSON.parse(JSON.stringify(val));
    }

    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
};

export const toObjectId = (id: string | Types.ObjectId) => {
  if (id instanceof Types.ObjectId) {
    return id;
  }

  return new Types.ObjectId(id);
};

export const objectIdToString = (val: Types.ObjectId | string) => {
  if (val instanceof Types.ObjectId) return val.toString();
  return val;
};

export const convertObjectIdToString = (val: any) => {
  if (val instanceof Document) return convertObjectIdToString(val.toObject());

  if (val instanceof Types.ObjectId) return val.toString();

  if (isFunction(val) || isDate(val) || !isObject(val)) return val;

  if (isArray(val)) return map(val, convertObjectIdToString);

  return reduce(
    keys(val),
    (prev: any, key) => ({ ...prev, [key]: convertObjectIdToString(val[key]) }),
    {},
  );
};

export interface trimObjectValuesProps {
  omitEmpty?: boolean;
  exclude?: string[];
  excludePrefix?: string[];
  exposeEmptyArray?: boolean;
}

export function generateShortUUID(): string {
  const uuid = v7();
  const hash = createHash('sha256').update(uuid).digest('base64');
  return hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
}

export const handleCrawUrl = async (url: string): Promise<any> => {
  let cleanUrl = url;

  if (includes(url, 'youtube.com') || includes(url, 'youtu.be')) {
    const match = url.match(/[?&]v=([^&]+)/);
    if (match) {
      cleanUrl = `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }

  const preview = await getLinkPreview(cleanUrl);

  if (includes(cleanUrl, 'youtube.com') || includes(cleanUrl, 'youtu.be')) {
    const videoId = cleanUrl.match(/[?&]v=([^&]+)/)?.[1];

    if (videoId) {
      (preview as any).thumbnailImage =
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    if (includes(url, 'shorts')) {
      (preview as any).thumbnailImage = head(get(preview, 'images', []));
    }
  }

  return preview;
};

export const getRandomColor = () => {
  const randomColor = `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`;

  return randomColor;
};
