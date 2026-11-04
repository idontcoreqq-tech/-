import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

const BUCKET = "assets";

let files;

function assetFiles() {
  if (!files) {
    files = new Files({ adapter: neon({ bucket: BUCKET }) });
  }
  return files;
}

export async function writeAsset(key, body, contentType = "application/octet-stream") {
  await assetFiles().upload(key, body, { contentType });
}

export async function readAsset(key) {
  const file = await assetFiles().download(key);
  return file.text();
}
