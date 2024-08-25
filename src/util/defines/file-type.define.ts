import * as vscode from 'vscode';

const EXTENSION_FILE_TYPE = {
  rb: "ruby",
  erb: "ruby",
  builder: "ruby",
  gemspec: "ruby",
  god: "ruby",
  irbrc: "ruby",
  jbuilder: "ruby",
  mspec: "ruby",
  podspec: "ruby",
  rabl: "ruby",
  rake: "ruby",
  rbuild: "ruby",
  rbw: "ruby",
  rbx: "ruby",
  ru: "ruby",
  ruby: "ruby",
  thor: "ruby",
  watchr: "ruby",
  rss: "rss",
  md: "markdown",
  markdown: "markdown",
  mkd: "markdown",
  mkdn: "markdown",
  mkdown: "markdown",
  ron: "markdown",
  json: "json",
  geojson: "json",
  lock: "json",
  topojson: "json",
  zip: "file-zip",
  gz: "file-zip",
  tar: "file-zip",
  pdf: "file-pdf",
  ai: "file-media",
  avif: "file-media",
  bmp: "file-media",
  eps: "file-media",
  gif: "file-media",
  heif: "file-media",
  ico: "file-media",
  indd: "file-media",
  jpeg: "file-media",
  jpg: "file-media",
  png: "file-media",
  psd: "file-media",
  raw: "file-media",
  svg: "file-media",
  tiff: "file-media",
  webp: "file-media",
  mp4: "file-media",
  mov: "file-media",
  wmv: "file-media",
  avi: "file-media",
  mkv: "file-media",
  webm: "file-media",
  diff: "diff",
  patch: "diff"
};

export function getFileType(file: vscode.Uri): string {
  const extension = (file.toString().substring(file.toString().lastIndexOf(".") + 1) as keyof Object);
  return EXTENSION_FILE_TYPE[extension] ? EXTENSION_FILE_TYPE[extension].toString().toLowerCase() : 'file';
}

export function getFileExtension(file: vscode.Uri): string {
  // path.parse(filePath).name
  return (file.toString().substring(file.toString().lastIndexOf(".") + 1) as keyof Object);
}

export function getFileName(file: vscode.Uri): string {
  // path.parse(filePath).name
  return file.toString().substring(file.toString().lastIndexOf("/") + 1);
}
