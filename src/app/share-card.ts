import { JUZ_STATUS } from './entities/entities';

// Images for WhatsApp Status, made on the phone at the moments people want to share: a juz just finished, a khitma
// completed. Everyone who sees the status sees the khitma's progress and khitma.net; the caption carries the link.

export interface ShareCard {
  /** "أتممتُ قراءة الجزء 5" / "تمّت الختمة بفضل الله" */
  headline: string;
  title: string;
  /** The status of each of the 30 ajza, drawn like the app's grid. */
  statuses: number[];
  /** The juz just finished, ringed in the grid (0-based). */
  highlight?: number | null;
  /** "تمّت قراءة 12 من 30 جزءًا" */
  progress: string;
  /** The line above khitma.net. */
  invitation: string;
  rtl: boolean;
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

const FONT = '"Markazi Text", Tahoma, Arial, sans-serif';
const TEAL = '#075E54';
const COLORS: Record<number, { fill: string; text: string }> = {
  [JUZ_STATUS.IDLE]: { fill: '#fa897b', text: '#8b0000' },
  [JUZ_STATUS.BOOKED]: { fill: '#ffdd94', text: '#a52a2a' },
  [JUZ_STATUS.DONE]: { fill: '#d0e6a5', text: '#006400' },
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) {
    lines.push(line);
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] += '…';
  }
  return lines;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Draws the card and returns it as a PNG. */
export async function renderShareCard(card: ShareCard, doc: Document = document): Promise<Blob> {
  const canvas = doc.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  canvas.dir = card.rtl ? 'rtl' : 'ltr';
  const ctx = canvas.getContext('2d')!;

  await Promise.all([
    doc.fonts?.load(`700 100px ${FONT}`, card.headline),
    doc.fonts?.load(`400 60px ${FONT}`, card.title + card.progress + card.invitation),
  ]).catch(() => undefined);
  const logo = await loadImage('assets/khitma-logo.png');

  ctx.fillStyle = '#f7f6f1';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = 'rgba(7, 94, 84, 0.06)';
  ctx.beginPath();
  ctx.arc(CARD_WIDTH, 0, 420, 0, Math.PI * 2);
  ctx.arc(0, CARD_HEIGHT, 380, 0, Math.PI * 2);
  ctx.fill();

  const center = CARD_WIDTH / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = card.rtl ? 'rtl' : 'ltr';

  if (logo) {
    ctx.drawImage(logo, center - 140, 60, 280, 280);
  }

  let y = 420;
  ctx.fillStyle = TEAL;
  ctx.font = `700 100px ${FONT}`;
  for (const line of wrap(ctx, card.headline, 940, 2)) {
    ctx.fillText(line, center, y);
    y += 110;
  }

  ctx.fillStyle = '#3a3a3a';
  ctx.font = `400 60px ${FONT}`;
  for (const line of wrap(ctx, card.title, 920, 2)) {
    ctx.fillText(line, center, y);
    y += 70;
  }

  // The 30 ajza, 5 to a row as in the app, as large as the space left allows.
  const ctaTop = CARD_HEIGHT - 300;
  const gridTop = y + 20;
  const gap = 24;
  const size = Math.min(104, Math.floor((ctaTop - 140 - gridTop - 5 * gap) / 6));
  const gridWidth = 5 * size + 4 * gap;
  const left = center - gridWidth / 2;
  ctx.font = `700 ${Math.round(size * 0.46)}px ${FONT}`;
  ctx.textBaseline = 'middle';
  card.statuses.forEach((status, index) => {
    const cx = left + (index % 5) * (size + gap) + size / 2;
    const cy = gridTop + Math.floor(index / 5) * (size + gap) + size / 2;
    const colors = COLORS[status] ?? COLORS[JUZ_STATUS.IDLE];
    ctx.fillStyle = colors.fill;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    if (index === card.highlight) {
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = colors.text;
    ctx.fillText(String(index + 1), cx, cy + 2);
  });
  ctx.textBaseline = 'alphabetic';
  y = gridTop + 6 * size + 5 * gap + 80;

  ctx.fillStyle = '#3a3a3a';
  ctx.font = `400 56px ${FONT}`;
  ctx.fillText(card.progress, center, y);

  ctx.fillStyle = TEAL;
  roundedRect(ctx, 110, ctaTop, CARD_WIDTH - 220, 200, 48);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 52px ${FONT}`;
  ctx.fillText(wrap(ctx, card.invitation, CARD_WIDTH - 300, 1)[0] ?? '', center, ctaTop + 82);
  ctx.font = `700 72px ${FONT}`;
  ctx.direction = 'ltr';
  ctx.fillText('khitma.net', center, ctaTop + 162);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The card could not be drawn'))), 'image/png')
  );
}
