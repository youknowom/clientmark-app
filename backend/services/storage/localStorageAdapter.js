import fs from "fs";
import path from "path";

export class LocalStorageAdapter {
  constructor(baseDir = "uploads") {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  _resolveSafePath(storagePath) {
    // Prevent directory traversal attacks
    const normalized = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.resolve(this.baseDir, normalized);

    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error("Security Alert: Path traversal attempt detected.");
    }

    return fullPath;
  }

  async saveFile(tenantId, fileName, buffer) {
    const safeTenant = String(tenantId).replace(/[^a-zA-Z0-9_\-]/g, "");
    const safeFileName = path.basename(fileName);

    const tenantDir = path.join(this.baseDir, safeTenant);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const fullPath = path.join(tenantDir, safeFileName);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error("Security Alert: Path traversal attempt detected.");
    }

    await fs.promises.writeFile(fullPath, buffer);
    const relativeStoragePath = path.join(safeTenant, safeFileName).replace(/\\/g, "/");

    return {
      storagePath: relativeStoragePath,
      fullPath,
    };
  }

  getStream(storagePath) {
    const fullPath = this._resolveSafePath(storagePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fs.createReadStream(fullPath);
  }

  async deleteFile(storagePath) {
    try {
      const fullPath = this._resolveSafePath(storagePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
    } catch (err) {
      // Ignore
    }
    return false;
  }

  fileExists(storagePath) {
    try {
      const fullPath = this._resolveSafePath(storagePath);
      return fs.existsSync(fullPath);
    } catch (err) {
      return false;
    }
  }
}

export default LocalStorageAdapter;
