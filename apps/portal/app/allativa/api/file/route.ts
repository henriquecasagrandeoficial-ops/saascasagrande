import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

// Serve imagens armazenadas na Blob store privada.
// A rota é pública porque as imagens dos produtos aparecem no
// catálogo para visitantes não autenticados, mas os arquivos em si
// continuam protegidos: só são acessíveis através deste proxy.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.searchParams.get("pathname");

  if (!pathname) {
    return NextResponse.json(
      { error: "Parâmetro 'pathname' obrigatório." },
      { status: 400 }
    );
  }

  try {
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) {
      return new NextResponse("Imagem não encontrada.", { status: 404 });
    }

    // Arquivo não mudou — o navegador pode usar a cópia em cache.
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
