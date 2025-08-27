import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OCR_URL = 'https://api.ocr.space/parse/image';
const MAX_BYTES = 8 * 1024 * 1024; // ~8 MB to avoid timeouts
const TIMEOUT_MS = 60000; // 60s provider timeout

export async function POST(req) {
  try {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return new NextResponse('Server misconfigured: OCR_SPACE_API_KEY missing.', { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return new NextResponse('Invalid file: upload a PDF as form-data field "file".', { status: 400 });
    }

    // Basic validation and size guard
    const filename = file.name || 'upload.pdf';
    const type = file.type || '';
    const size = typeof file.size === 'number' ? file.size : 0;
    const isPdf = type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return new NextResponse('Invalid file: only PDF is supported.', { status: 400 });
    }
    if (size > MAX_BYTES) {
      return new NextResponse('PDF too large for realtime OCR. Please use a PDF <= 8 MB.', { status: 413 });
    }

    // Build provider form-data
    const providerForm = new FormData();
    providerForm.append('language', 'eng');
    providerForm.append('isTable', 'true');
    providerForm.append('isCreateSearchablePdf', 'false');
    providerForm.append('OCREngine', '2');
    providerForm.append('file', file, filename);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let providerRes;
    try {
      providerRes = await fetch(OCR_URL, {
        method: 'POST',
        headers: { apikey: apiKey },
        body: providerForm,
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        return new NextResponse('OCR request timed out after 60s. Try a smaller PDF.', { status: 504 });
      }
      return new NextResponse(`Failed to reach OCR provider: ${err?.message || 'network error'}`, { status: 502 });
    } finally {
      clearTimeout(t);
    }

    if (!providerRes.ok) {
      const bodyText = await providerRes.text().catch(() => '');
      return new NextResponse(
        `OCR provider error: HTTP ${providerRes.status}. ${bodyText?.slice(0, 200) || ''}`.trim(),
        { status: 502 }
      );
    }

    let json;
    try {
      json = await providerRes.json();
    } catch {
      return new NextResponse('OCR provider returned invalid JSON.', { status: 502 });
    }

    if (json?.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join('; ') : json?.ErrorMessage || 'Unknown error';
      return new NextResponse(`OCR provider error: ${msg}`, { status: 502 });
    }

    const results = Array.isArray(json?.ParsedResults) ? json.ParsedResults : [];
    const text = results
      .map((r) => (r?.ParsedText || '').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (!text) {
      return new NextResponse('No text parsed from PDF.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }

    return new NextResponse(text, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  } catch (err) {
    return new NextResponse(`Unexpected server error: ${err?.message || 'unknown error'}`, { status: 500 });
  }
}

