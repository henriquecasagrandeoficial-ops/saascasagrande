/**
 * Gera um slug amigável para URL a partir de um texto.
 * Ex.: "Pães de Queijo" -> "paes-de-queijo"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove caracteres inválidos
    .replace(/\s+/g, "-") // espaços -> hífen
    .replace(/-+/g, "-"); // colapsa hífens repetidos
}
