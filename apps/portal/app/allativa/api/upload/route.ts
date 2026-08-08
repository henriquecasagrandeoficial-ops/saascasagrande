import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { auth } from "@/auth";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Limite seguro para Vercel Serverless (body máx. ~4.5 MB).
const MAX_SIZE_IN_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Armazenamento não configurado. Adicione BLOB_READ_WRITE_TOKEN nas variáveis da Vercel.",
      },
      { status: 500 }
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nenhum arquivo enviado." },
      { status: 400 }
    );
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato inválido. Use JPG, PNG, WEBP ou GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_IN_BYTES) {
    return NextResponse.json(
      { error: "A imagem deve ter no máximo 4 MB." },
      { status: 400 }
    );
  }

  try {
    // A Blob store está configurada como privada, então enviamos com
    // access "private". O arquivo não fica acessível pela URL direta;
    // por isso servimos as imagens através da rota /api/file.
    const blob = await put(file.name, file, {
      access: "private",
      addRandomSuffix: true,
    });

    // Guardamos uma URL relativa que aponta para a rota de entrega.
    // Isso funciona tanto no admin quanto no catálogo público.
    const url = `/allativa/api/file?pathname=${encodeURIComponent(blob.pathname)}`;

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
