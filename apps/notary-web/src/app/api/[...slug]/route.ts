import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/proxy';

export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return handleProxy(req, params.slug);
}
export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return handleProxy(req, params.slug);
}
export async function PUT(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return handleProxy(req, params.slug);
}
export async function PATCH(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return handleProxy(req, params.slug);
}
export async function DELETE(req: NextRequest, { params }: { params: { slug: string[] } }) {
  return handleProxy(req, params.slug);
}

function handleProxy(req: NextRequest, slug: string[]) {
  const [service, ...rest] = slug;
  // Services mount their own path prefixes; forward the remainder verbatim
  // and preserve the query string.
  const search = req.nextUrl.search || '';
  const path = `/${rest.join('/')}${search}`;
  return proxyRequest(service, path, req);
}
