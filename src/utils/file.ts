import { v4 as uuidv4 } from 'uuid';

export function mapToAttachments(urls: string[]) {
  return urls.map((url) => {
    const filename = decodeURIComponent(url.split('/').pop() || '');

    const match = filename.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
    const ext = match ? `.${match[1].toLowerCase()}` : '';

    let type: 'image' | 'video' | 'audio' | 'file' = 'file';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      type = 'image';
    } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      type = 'video';
    } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
      type = 'audio';
    }

    return {
      id: uuidv4(),
      filename,
      url,
      size: undefined,
      type,
    };
  });
}
