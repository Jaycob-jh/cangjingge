(() => {
  document.querySelectorAll('.topic-bibliography').forEach(root => {
    const input=root.querySelector('[data-topic-search]');
    const papers=Array.from(root.querySelectorAll('.topic-paper'));
    const normalize=x=>x.normalize('NFKC').toLocaleLowerCase().replace(/https?:\/\/(?:dx\.)?doi\.org\//g,'').trim();
    const update=()=>{
      const words=normalize(input.value).split(/\s+/).filter(Boolean);
      let count=0;
      for(const paper of papers){paper.hidden=!words.every(word=>normalize(paper.textContent).includes(word));if(!paper.hidden)count++;}
      root.querySelector('[data-topic-count]').textContent=count+' / '+papers.length+' 篇论文';
      root.querySelector('[data-topic-empty]').hidden=count>0;
    };
    input.addEventListener('input',update);
  });
})();
