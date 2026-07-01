import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { docsContentRoute, docsRoute } from '@/lib/shared';

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);

export default function proxy(request: NextRequest) {
  const result = rewriteSuffix(request.nextUrl.pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  // Disable automatic markdown negotiation to prevent downloads when accessing docs normally
  // Only redirect to markdown if the URL explicitly ends with .md
  // if (isMarkdownPreferred(request)) {
  //   const result = rewriteDocs(request.nextUrl.pathname);
  // 
  //   if (result) {
  //     return NextResponse.rewrite(new URL(result, request.nextUrl));
  //   }
  // }

  return NextResponse.next();
}
