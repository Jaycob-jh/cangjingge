const siteRoot = new URL('../', import.meta.url);
export const readingIndex = fetch(new URL('reading-links.json', import.meta.url)).then(response => {
  if (!response.ok) throw Error('阅读入口暂未载入');
  return response.json();
});

export function renderReadingLinks(target, links = [], compact = false) {
  const visible = links.filter(link => !compact || link.kind !== 'question');
  if (!visible.length) return;
  const nav = document.createElement('nav');
  nav.className = 'zk-reading-links';
  nav.setAttribute('aria-label', '阅读入口');
  for (const link of visible) {
    const anchor = document.createElement('a');
    anchor.className = 'no-external';
    anchor.href = new URL(link.href, siteRoot);
    anchor.textContent = compact && link.kind === 'note' ? '论文解读' : link.title;
    anchor.title = link.title;
    if (compact && link.kind === 'note') anchor.setAttribute('aria-label', '论文解读：' + link.title);
    nav.append(anchor);
  }
  target.append(nav);
}

const study = document.getElementById('study-reading-links');
if (study) {
  try {
    const links = (await readingIndex).studies[study.dataset.study] || [];
    if (links.length) {
      const heading = document.createElement('h2');
      heading.textContent = '相关解读与专题';
      study.append(heading);
      renderReadingLinks(study, links);
    }
  } catch {
    study.textContent = '阅读入口暂未载入，请刷新重试。';
  }
}
