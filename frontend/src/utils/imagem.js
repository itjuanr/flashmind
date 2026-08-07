/**
 * Reduz e recomprime a imagem no navegador antes de virar data URI.
 *
 * As imagens do app (ícone de deck, avatar, mídia de card) são guardadas em
 * base64 dentro do MongoDB. Uma foto de celular de 2MB ocupa ~2,7MB depois do
 * base64 e viaja inteira em toda listagem que a inclua. Trocar isso por
 * armazenamento de arquivos é a solução definitiva, mas comprimir antes já
 * derruba o tamanho em uma ordem de grandeza — sem infraestrutura nova e sem
 * migrar nada do que já existe.
 *
 * WebP preserva transparência (JPEG não) e comprime melhor; o fallback cobre
 * navegadores antigos.
 */
export async function comprimirImagem(file, { maxLado = 1024, qualidade = 0.82 } = {}) {
  // SVG não é raster: redesenhar no canvas destruiria a vetorização.
  if (file.type === 'image/svg+xml') return lerComoDataURL(file);

  const bitmap = await carregarBitmap(file);

  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura  = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close?.();

  const webp = canvas.toDataURL('image/webp', qualidade);
  // Navegador sem suporte a WebP devolve PNG silenciosamente; nesse caso o
  // JPEG é bem menor, ao custo da transparência.
  const saida = webp.startsWith('data:image/webp')
    ? webp
    : canvas.toDataURL('image/jpeg', qualidade);

  // Se a compressão não ajudou (imagem já minúscula), fica com a original.
  const original = await lerComoDataURL(file);
  return saida.length < original.length ? saida : original;
}

function carregarBitmap(file) {
  if (window.createImageBitmap) return createImageBitmap(file);
  // Fallback para navegadores sem createImageBitmap
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida.')); };
    img.src = url;
  });
}

function lerComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    r.readAsDataURL(file);
  });
}

/** Formata bytes aproximados de um data URI, para mensagens ao usuário. */
export function tamanhoLegivel(dataUri) {
  const bytes = Math.round((dataUri.length * 3) / 4);
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
