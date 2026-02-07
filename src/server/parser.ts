import { IncomingMessage} from 'node:http';
import { URLSearchParams } from "node:url";
import {
  HttpMethod,
  RequestContext,
} from './types';

type MultipartFile = {
  fieldname: string;
  filename: string;
  contentType: string;
  data: Buffer;
};

type MultipartResult = {
  fields: Record<string, string | string[]>;
  files: MultipartFile[];
};

function getBoundary(contentType: string): string | null {
  // e.g. "multipart/form-data; boundary=----WebKitFormBoundaryabc123"
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  return m ? (m[1] || m[2]) : null;
}

function addField(
  fields: Record<string, string | string[]>,
  name: string,
  value: string
) {
  const cur = fields[name];
  if (cur === undefined) fields[name] = value;
  else if (Array.isArray(cur)) cur.push(value);
  else fields[name] = [cur, value];
}

function parseMultipart(body: Buffer, contentType: string): MultipartResult {
  const boundary = getBoundary(contentType);
  if (!boundary) throw new Error("Missing multipart boundary");

  const boundaryBuf = Buffer.from(`--${boundary}`);
  const endBoundaryBuf = Buffer.from(`--${boundary}--`);

  const fields: Record<string, string | string[]> = {};
  const files: MultipartFile[] = [];

  // Split by boundary occurrences.
  // This is a buffered approach; safe for small/medium payloads with strict limits.
  let pos = 0;

  // Multipart starts with --boundary\r\n
  // Find first boundary
  let start = body.indexOf(boundaryBuf, pos);
  if (start === -1) throw new Error("Boundary not found");

  pos = start;

  while (true) {
    // Check end boundary
    const endBoundaryPos = body.indexOf(endBoundaryBuf, pos);
    const boundaryPos = body.indexOf(boundaryBuf, pos);

    if (boundaryPos === -1) break;

    // Move to after "--boundary"
    let partStart = boundaryPos + boundaryBuf.length;

    // If this is the final boundary, stop
    if (body.slice(boundaryPos, boundaryPos + endBoundaryBuf.length).equals(endBoundaryBuf)) {
      break;
    }

    if (body[partStart] === 0x2d && body[partStart + 1] === 0x2d) break; // "--" (end)
    if (body[partStart] === 0x0d && body[partStart + 1] === 0x0a) {
      partStart += 2;
    } else {
      // tolerate missing CRLF
    }

    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), partStart);
    if (headerEnd === -1) throw new Error("Malformed part headers");

    const headerText = body.slice(partStart, headerEnd).toString("utf8");
    const headers = parsePartHeaders(headerText);

    const disp = headers["content-disposition"] || "";
    const { name, filename } = parseContentDisposition(disp);

    const contentTypePart = headers["content-type"] || "application/octet-stream";

    const dataStart = headerEnd + 4;

    const nextBoundary = body.indexOf(Buffer.from("\r\n--" + boundary), dataStart);
    if (nextBoundary === -1) throw new Error("Next boundary not found");

    const dataEnd = nextBoundary; // excludes the preceding \r\n before boundary

    const data = body.slice(dataStart, dataEnd);

    if (!name) {
    //do nothing
    } else if (filename) {
      files.push({
        fieldname: name,
        filename,
        contentType: contentTypePart,
        data,
      });
    } else {
      // Field: interpret as utf8 text
      addField(fields, name, data.toString("utf8"));
    }

    pos = nextBoundary + 2; // move past leading \r\n
  }

  return { fields, files };
}

function parsePartHeaders(headerText: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of headerText.split("\r\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    out[k] = v;
  }
  return out;
}

function parseContentDisposition(v: string): { name: string | null; filename: string | null } {
  // e.g. form-data; name="file"; filename="a.png"
  const nameM = /name="([^"]+)"/i.exec(v);
  const fileM = /filename="([^"]*)"/i.exec(v);
  return {
    name: nameM ? nameM[1] : null,
    filename: fileM ? fileM[1] : null,
  };
}

async function parseJson(req: RequestContext, { limitBytes = 10 * 1024 * 1024  } = {}) {
  const raw: Buffer = await new Promise<Buffer>((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(Object.assign(new Error("Body too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
  const ct = (req.headers["content-type"] || "").toLowerCase();

  if (ct.includes("application/json")) {
    const text = raw.toString("utf8");
    return text ? JSON.parse(text) : null;
  }

  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = raw.toString("utf8");
    return Object.fromEntries(new URLSearchParams(text));
  }

  // fallback: treat as text
  return raw.toString("utf8");
}


export async function parseRequest(req: IncomingMessage) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  const raw = await parseJson(req, { limitBytes: 20 * 1024 * 1024 });

  if (ct.includes("multipart/form-data")) {
    const { fields, files } = parseMultipart(raw, req.headers["content-type"] || "");
    return { body: fields, files };
  }

  // otherwise parse json/urlencoded/text as you already do
  return { body: raw, files: [] };
}