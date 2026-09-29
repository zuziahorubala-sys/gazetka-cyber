// Uruchamiane (przez javascript_tool) na stronie wyników wyszukiwania X (f=live).
// Przewija wyniki, zbiera wpisy z ostatnich 26 h i podmienia treść strony na zwykły
// tekst, który potem odczytuje get_page_text.
// LINKS zawiera pary "widoczny tekst -> adres t.co"; t.co przekierowuje do właściwego raportu.
// TRUNCATED: yes oznacza, że post jest dłuższy — otwórz URL posta, żeby przeczytać całość.
const HOURS = 26;
const cutoff = Date.now() - HOURS * 3600 * 1000;
const out = new Map();
const grab = () => document.querySelectorAll('article[data-testid="tweet"]').forEach(a => {
  const link = [...a.querySelectorAll('a[href*="/status/"]')].find(x => x.querySelector('time'));
  if (!link) return;
  const url = 'https://x.com' + link.getAttribute('href');
  if (out.has(url)) return;
  const time = link.querySelector('time').getAttribute('datetime');
  if (Date.parse(time) < cutoff) return;
  const user = (a.querySelector('[data-testid="User-Name"]')?.innerText || '').split('\n').find(s => s.startsWith('@')) || '';
  const texts = [...a.querySelectorAll('[data-testid="tweetText"]')].map(t => t.innerText);
  const likes = a.querySelector('[data-testid="like"]')?.innerText || '0';
  const rts = a.querySelector('[data-testid="retweet"]')?.innerText || '0';
  const truncated = !!a.querySelector('[data-testid="tweet-text-show-more-link"]');
  const links = [...new Set([...a.querySelectorAll('a[href^="https://t.co"]')]
    .map(x => `${x.innerText.replace(/\s+/g, ' ').trim().slice(0, 120) || '(link)'} -> ${x.getAttribute('href')}`))];
  const quotedLink = [...a.querySelectorAll('a[href*="/status/"]')].map(x => x.getAttribute('href'))
    .find(h => !h.includes('/analytics') && 'https://x.com' + h !== url && /\/status\/\d+$/.test(h));
  const card = a.querySelector('[data-testid="card.wrapper"]')?.innerText.replace(/\s+/g, ' ').slice(0, 300) || '';
  out.set(url, [
    `### ${user} | ${time} | likes ${likes} | reposts ${rts}${truncated ? ' | TRUNCATED: yes' : ''}`,
    `URL: ${url}`,
    `TEXT: ${(texts[0] || '').slice(0, 3000)}`,
    texts[1] ? `QUOTED (${quotedLink ? 'https://x.com' + quotedLink : '?'}): ${texts[1].slice(0, 1000)}` : '',
    links.length ? `LINKS:\n  ${links.join('\n  ')}` : '',
    card ? `CARD: ${card}` : '',
  ].filter(Boolean).join('\n'));
});
let stale = 0, last = 0, oldSeen = false;
for (let i = 0; i < 25 && stale < 4 && !oldSeen; i++) {
  grab();
  oldSeen = [...document.querySelectorAll('article time')].some(t => Date.parse(t.getAttribute('datetime')) < cutoff);
  window.scrollBy(0, 3000);
  await new Promise(r => setTimeout(r, 1800));
  if (out.size === last) stale++; else { stale = 0; last = out.size; }
}
grab();
const dump = `TWEETS: ${out.size}\n\n` + [...out.values()].join('\n\n');
const pre = document.createElement('pre');
pre.textContent = dump;
const main = document.createElement('main');
main.appendChild(pre);
document.body.replaceChildren(main);
out.size
