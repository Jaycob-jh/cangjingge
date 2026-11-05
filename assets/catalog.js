// A static bibliography: no account data, PDFs, dependencies or remote service.
(async () => {
  const browser = document.getElementById("catalog-browser");
  const detail = document.getElementById("catalog-record");
  if (!browser && !detail) return;
  const node = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  try {
    const response = await fetch(new URL("catalog.json", document.currentScript.src));
    if (!response.ok) throw new Error("目录文件暂时不可用，请刷新重试。");
    const catalog = await response.json();
    const topics = new Map(catalog.topics.map(t => [t.id, t]));
    const topicName = id => topics.get(id)?.name || id;
    const typeName = type => ({
      article: "期刊论文", journalArticle: "期刊论文", "journal-article": "期刊论文",
      preprint: "预印本", book: "图书", "edited-book": "图书", bookSection: "书籍章节",
      "book-chapter": "书籍章节", thesis: "学位论文", dissertation: "学位论文",
      report: "报告", presentation: "课程讲义", manual: "软件手册"
    })[type] || "";
    const doiUrl = doi => "https://doi.org/" + doi.split("/").map(encodeURIComponent).join("/");
    const citation = r => [r.journal, r.volume && r.volume + (r.issue ? "(" + r.issue + ")" : ""), r.pages, r.year].filter(Boolean).join(" · ");
    const link = (title, href) => {
      const a = node("a", title);
      a.href = href;
      return a;
    };
    const topicLinks = r => {
      const wrap = node("div", undefined, "zk-catalog-tags");
      for (const code of r.topics.filter(t => t.includes(".") || !r.topics.some(s => s.startsWith(t + ".")))) {
        const params = new URLSearchParams({topic: topics.get(code)?.parent || code});
        if (topics.get(code)?.parent) params.set("subtopic", code);
        wrap.append(link(topicName(code), "index.html?" + params));
      }
      return wrap;
    };
    if (detail) {
      const recordId = new URLSearchParams(location.search).get("id") || location.hash.slice(1);
      const record = catalog.records.find(r => r.id === recordId || r.aliases?.includes(recordId));
      detail.replaceChildren();
      if (!record) {
        detail.append(node("p", "未找到这个文献条目，请返回目录检索。"));
        return;
      }
      document.querySelector("h1").textContent = record.title;
      document.title = record.title + " – 藏经阁 Cangjingge";
      detail.append(node("p", record.authors.join("; ") || "作者信息整理中"), node("p", citation(record)));
      if (record.doi) detail.append(link("DOI: " + record.doi, doiUrl(record.doi)));
      else if (record.url) detail.append(link("查看原始资料", record.url));
      detail.append(node("p", [typeName(record.type), "阅读进度：" + record.reading_status].filter(Boolean).join(" · ")), topicLinks(record));
      if (record.summary) detail.append(node("h2", "阅读摘要"), node("p", record.summary));
      if (record.curated_path) detail.append(link("阅读已整理卡片", record.curated_path));
      return;
    }
    const get = id => document.getElementById("catalog-" + id);
    const params = new URLSearchParams(location.search);
    const controls = ["query", "topic", "subtopic", "stage", "sort"];
    const hasTopic = (r, id) => !id || r.topics.some(t => t === id || t.startsWith(id + "."));
    const topicCount = id => catalog.records.filter(r => hasTopic(r, id)).length;
    for (const t of catalog.topics.filter(t => !t.parent)) get("topic").add(new Option(t.name + " (" + topicCount(t.id) + ")", t.id));
    const subtopics = () => {
      const old = get("subtopic").value;
      get("subtopic").replaceChildren(new Option("全部细分主题", ""));
      for (const t of catalog.topics.filter(t => t.parent && (!get("topic").value || t.parent === get("topic").value))) {
        const count = topicCount(t.id);
        if (count) get("subtopic").add(new Option(t.id + " " + t.name + " (" + count + ")", t.id));
      }
      if ([...get("subtopic").options].some(o => o.value === old)) get("subtopic").value = old;
    };
    get("query").value = params.get("q") || "";
    for (const id of ["topic", "stage", "sort"]) {
      const value = params.get(id);
      if (value && [...get(id).options].some(o => o.value === value)) get(id).value = value;
    }
    subtopics();
    if (params.get("subtopic")) get("subtopic").value = params.get("subtopic");
    let page = 1;
    const pageSize = 20;
    const fold = s => s.normalize("NFKC").toLocaleLowerCase();
    const searchable = new Map(catalog.records.map(r => [r.id, fold([r.title, ...r.authors, r.doi || "", r.journal, r.year || ""].join(" "))]));
    const render = () => {
      const terms = fold(get("query").value.trim()).split(/\s+/).filter(Boolean);
      let rows = catalog.records.filter(r =>
        terms.every(t => searchable.get(r.id).includes(t)) &&
        hasTopic(r, get("topic").value) && hasTopic(r, get("subtopic").value) &&
        (!get("stage").value || r.reading_status === get("stage").value));
      if (get("sort").value === "title") rows.sort((a, b) => a.title.localeCompare(b.title));
      const pages = Math.max(1, Math.ceil(rows.length / pageSize));
      page = Math.min(page, pages);
      const filtered = terms.length || ["topic", "subtopic", "stage"].some(id => get(id).value);
      get("count").textContent = filtered ? "匹配 " + rows.length.toLocaleString() + " 条" : "";
      get("count").hidden = !filtered;
      const cards = rows.slice((page - 1) * pageSize, page * pageSize).map(r => {
        const card = node("article", undefined, "zk-catalog-card");
        const heading = node("h3");
        heading.append(link(r.title, r.curated_path || "record.html?id=" + encodeURIComponent(r.id)));
        card.append(heading, node("p", r.authors.slice(0, 4).join("; ") + (r.authors.length > 4 ? " et al." : ""), "zk-catalog-authors"), node("p", citation(r), "zk-catalog-meta"));
        const footer = node("div", undefined, "zk-catalog-meta");
        footer.append(node("span", r.reading_status));
        if (r.doi) footer.append(link(r.doi, doiUrl(r.doi)));
        card.append(footer, topicLinks(r));
        return card;
      });
      get("results").replaceChildren(...(cards.length ? cards : [node("p", "没有匹配文献，可更换检索词或分类。")]));
      get("page").textContent = page + " / " + pages;
      get("prev").disabled = page === 1;
      get("next").disabled = page === pages;
      const query = new URLSearchParams();
      for (const id of controls) if (get(id).value && !(id === "sort" && get(id).value === "year")) query.set(id === "query" ? "q" : id, get(id).value);
      history.replaceState(null, "", location.pathname + (query.size ? "?" + query : ""));
    };
    for (const id of controls) get(id).addEventListener(id === "query" ? "input" : "change", () => {
      page = 1;
      if (id === "topic") { get("subtopic").value = ""; subtopics(); }
      render();
    });
    get("prev").addEventListener("click", () => { page--; render(); });
    get("next").addEventListener("click", () => { page++; render(); });
    render();
  } catch (error) {
    if (detail) detail.replaceChildren(node("p", "目录载入失败，请刷新页面重试。"));
    else document.getElementById("catalog-count").textContent = "目录载入失败，请刷新页面重试。";
    console.error(error);
  }
})();
