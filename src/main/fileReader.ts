import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { classifyFileType, type FileMeta } from '../shared/eventTypes';

// 文件大小限制
const MAX_TEXT_SIZE = 1024 * 1024;  // 1MB 文本上限
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB 图片上限
const MAX_BASE64_PREVIEW = 1024;  // base64 预览长度

export interface FileReadResult {
  content?: string;
  contentType?: 'text' | 'image' | 'binary' | 'unknown';
  encoding?: 'utf8' | 'base64';
  error?: string;
}

/**
 * 读取文件内容
 * 文本文件返回 UTF-8 内容
 * 图片文件返回 base64 编码
 * 二进制文件或超大文件只返回类型信息
 */
export async function readFileContent(filePath: string): Promise<FileReadResult> {
  try {
    const stats = await stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = classifyFileType(extension);

    // 文本文件
    if (contentType === 'text') {
      if (stats.size > MAX_TEXT_SIZE) {
        return {
          contentType,
          error: `文件过大 (${(stats.size / 1024 / 1024).toFixed(1)}MB)，超过 1MB 限制`
        };
      }

      try {
        const content = await readFile(filePath, 'utf8');
        return { content, contentType, encoding: 'utf8' };
      } catch (readError) {
        return {
          contentType,
          error: `读取文本失败: ${readError instanceof Error ? readError.message : String(readError)}`
        };
      }
    }

    // 图片文件
    if (contentType === 'image') {
      if (stats.size > MAX_IMAGE_SIZE) {
        return {
          contentType,
          error: `图片过大 (${(stats.size / 1024 / 1024).toFixed(1)}MB)，超过 10MB 限制`
        };
      }

      try {
        const buffer = await readFile(filePath);
        const content = buffer.toString('base64');
        return { content, contentType, encoding: 'base64' };
      } catch (readError) {
        return {
          contentType,
          error: `读取图片失败: ${readError instanceof Error ? readError.message : String(readError)}`
        };
      }
    }

    // 二进制文件或未知类型
    return { contentType };
  } catch (error) {
    // 文件不存在或无权限
    return {
      contentType: 'unknown',
      error: `无法访问文件: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 丰富文件元信息
 * 读取文件内容并填充到 FileMeta 中
 */
export async function enrichFileMeta(file: { path: string; name: string; size: number }): Promise<FileMeta> {
  const extension = path.extname(file.name);
  const contentType = classifyFileType(extension);
  const readResult = await readFileContent(file.path);

  return {
    path: file.path,
    name: file.name,
    extension,
    size: file.size,
    content: readResult.content,
    contentType: readResult.contentType || contentType,
    encoding: readResult.encoding
  };
}

/**
 * 批量丰富文件元信息
 */
export async function enrichFileMetas(
  files: Array<{ path: string; name: string; size: number }>
): Promise<FileMeta[]> {
  return Promise.all(files.map(enrichFileMeta));
}

/**
 * 获取文件内容预览（用于日志和调试）
 */
export function getFilePreview(meta: FileMeta): string {
  if (!meta.content) {
    return `[${meta.contentType || 'unknown'}] ${meta.name}`;
  }

  if (meta.contentType === 'text') {
    const preview = meta.content.length > MAX_BASE64_PREVIEW
      ? meta.content.substring(0, MAX_BASE64_PREVIEW) + '...'
      : meta.content;
    return `[text] ${meta.name}:\n${preview}`;
  }

  if (meta.contentType === 'image') {
    return `[image] ${meta.name} (${meta.encoding}, ${meta.content.length} chars)`;
  }

  return `[${meta.contentType}] ${meta.name}`;
}
