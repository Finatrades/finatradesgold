import { Express } from "express";
import { getFromR2, extractKeyFromR2Url, isR2Configured, logR2Config, getR2PublicUrl } from "./r2-storage";

export function registerR2ProxyRoutes(app: Express): void {
  logR2Config();
  
  app.get("/api/files/*", async (req: any, res) => {
    const key = req.params[0] as string;
    
    if (!key) {
      return res.status(400).json({ error: "File key required" });
    }
    
    if (!isR2Configured()) {
      console.log("[R2 Proxy] R2 not configured, cannot serve file:", key);
      return res.status(503).json({ error: "Storage not configured" });
    }
    
    try {
      console.log("[R2 Proxy] Fetching file:", key);
      const { body, contentType } = await getFromR2(key);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      body.pipe(res);
    } catch (error: any) {
      console.error("[R2 Proxy] Error fetching file:", key, error.message);
      if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Failed to fetch file" });
    }
  });
  
  console.log("[R2 Proxy] Routes registered");
}

export function convertToProxyUrl(r2Url: string | null | undefined): string | null {
  if (!r2Url) return null;
  
  const publicUrl = getR2PublicUrl();
  if (!publicUrl) return r2Url;
  
  if (r2Url.startsWith(publicUrl)) {
    const key = r2Url.substring(publicUrl.length + 1);
    return `/api/files/${key}`;
  }
  
  const match = r2Url.match(/r2\.dev\/(.+)$/);
  if (match) {
    return `/api/files/${match[1]}`;
  }
  
  return r2Url;
}
