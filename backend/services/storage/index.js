import LocalStorageAdapter from "./localStorageAdapter.js";

// Storage adapter factory / default instance
// In the future, this can switch to S3/R2 based on STORAGE_TYPE env variable
const getStorageAdapter = () => {
  const storageType = process.env.STORAGE_TYPE || "local";

  switch (storageType) {
    case "local":
    default:
      return new LocalStorageAdapter(process.env.UPLOADS_DIR || "uploads");
  }
};

export const storageAdapter = getStorageAdapter();
export default storageAdapter;
