import path from "path";
import { fileURLToPath } from "url";

const getDirname = (metaUrl) => {
  return path.dirname(fileURLToPath(metaUrl));
};

export {getDirname};
