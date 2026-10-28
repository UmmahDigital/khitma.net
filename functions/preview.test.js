import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewText, withPreview } from './preview.js';

const ajza = (statuses) => Object.fromEntries(statuses.map((status, index) => [String(index), { index, status, owner: '' }]));
const INDEX = `<html><head>
  <title>ختمة.نت — ختمة القرآن الكريم جماعيًّا</title>
  <meta name="description" content="generic">
  <meta property="og:url" content="https://khitma.net/">
  <meta property="og:title" content="generic">
  <meta property="og:description" content="generic">
  <meta name="twitter:title" content="generic">
  <meta name="twitter:description" content="generic">
</head><body></body></html>`;

test('a khitma in progress shows what was read and what is left', () => {
  const statuses = [...Array(12).fill(2), ...Array(5).fill(1), ...Array(13).fill(0)];
  assert.deepEqual(previewText({ title: ' ختمة عن روح جدّي رحمه الله ', type: 'SEQUENTIAL', ajza: ajza(statuses) }), {
    title: 'ختمة عن روح جدّي رحمه الله',
    description: 'تمّت قراءة 12 من 30 جزءًا. بقي 13 جزءًا بلا قارئ: اختاروا جزءًا وشاركونا الأجر 🤍',
  });
});

test('a new khitma, a fully booked one, a complete one, and other types', () => {
  assert.equal(previewText({ title: 'ختمة', ajza: ajza(Array(30).fill(0)) }).description, 'بقي 30 جزءًا بلا قارئ: اختاروا جزءًا وشاركونا الأجر 🤍');
  assert.equal(previewText({ title: 'ختمة', ajza: ajza([...Array(29).fill(2), 1]) }).description, 'تمّت قراءة 29 من 30 جزءًا. جميع الأجزاء محجوزة، ويمكنكم متابعة الختمة.');
  assert.equal(previewText({ title: 'ختمة', ajza: Array(30).fill({ status: 2 }) }).description, 'تمّت الختمة بفضل الله 🤍');
  assert.equal(previewText({ title: 'ورد', type: 'SAME_TASK' }).description, 'انضمّوا إلى الختمة وشاركونا الأجر 🤍');
  assert.equal(previewText({ ajza: ajza([2, 0]) }).title, 'ختمة.نت');
});

test('the tags carry the khitma, escaped, and the page stays out of search engines', () => {
  const page = withPreview(INDEX, { title: 'ختمة "العائلة" <3', description: 'بقي جزءان', url: 'https://khitma.net/group/abc' });
  assert.match(page, /<title>ختمة &quot;العائلة&quot; &lt;3<\/title>/);
  assert.match(page, /<meta property="og:title" content="ختمة &quot;العائلة&quot; &lt;3">/);
  assert.match(page, /<meta name="description" content="بقي جزءان">/);
  assert.match(page, /<meta property="og:description" content="بقي جزءان">/);
  assert.match(page, /<meta name="twitter:description" content="بقي جزءان">/);
  assert.match(page, /<meta property="og:url" content="https:\/\/khitma.net\/group\/abc">/);
  assert.match(page, /<meta name="robots" content="noindex">\n<\/head>/);
  assert.equal(page.match(/og:title/g).length, 1);
});
