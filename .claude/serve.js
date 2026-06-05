// Minimal zero-dependency static server for the BLISK prototype preview.
// Supports HTTP Range requests (needed for video seeking / scroll-scrub).
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const port = process.env.PORT || 4321;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end("forbidden"); }

    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404); return res.end("not found"); }
      const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
      const range = req.headers.range;

      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
        if (isNaN(start)) start = 0;
        if (isNaN(end) || end >= stat.size) end = stat.size - 1;
        if (start > end) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
          return res.end();
        }
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Type": type,
          "Content-Length": stat.size,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(file).pipe(res);
      }
    });
  })
  .listen(port, () => console.log("BLISK preview on http://localhost:" + port));
