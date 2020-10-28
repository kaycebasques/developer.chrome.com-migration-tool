(async () => {
  // TODO(kaycebasques): Note code blocks that have highlighting (which needs to be manually fixed)
  // Fix code blocks.
  document.querySelectorAll('devsite-code').forEach(block => {
    const pre = block.querySelector('pre');
    pre.innerHTML = pre.innerHTML.replace(/<br>/g, '\n');
    pre.innerHTML = pre.innerHTML.replace(/<strong\/?>/g, '');
    block.insertAdjacentElement('afterend', pre);
    block.remove();
  });
  // Get dates.
  const base = 'https://raw.githubusercontent.com/google/WebFundamentals/master/src/content/en/'
  const path = window.location.pathname.replace('/web/', '');
  let response = await fetch(`${base}${path}.md`);
  if (!response.ok) response = await fetch(`${base}${path}/index.md`);
  const text = await response.text();
  // Get the original publication date.
  const dateStart = text.search(/wf_published_on:/);
  const dateEnd = text.substring(dateStart).search(/\s+#}/);
  const dateValue = text.substring(dateStart, dateStart + dateEnd).replace(/wf_published_on:\s+/, '');
  const dateNode = document.createElement('p');
  dateNode.id = 'docs-migration-tool-date';
  dateNode.textContent = dateValue;
  document.body.appendChild(dateNode);
  // Get the last update.
  const updateStart = text.search(/wf_updated_on:/);
  const updateEnd = text.substring(updateStart).search(/\s+#}/);
  const updateValue = text.substring(updateStart, updateStart + updateEnd).replace(/wf_updated_on:\s+/, '');
  const updateNode = document.createElement('p');
  updateNode.id = 'docs-migration-tool-update';
  updateNode.textContent = updateValue;
  document.body.appendChild(updateNode);
  // Get authors.
  const authors = [].slice.call(document.querySelectorAll('section.wf-byline img'));
  authors.forEach(author => {
    let name = author.img.substring(author.img.lastIndexOf('/'));
    name.replace('.jpg', '');
    name.replace('.png', '');
    const p = document.createElement('p');
    p.textContent = name;
    p.classList.add('docs-migration-tool-author');
    document.body.appendChild(p);
  });
  window.modificationsDone = true;
})();