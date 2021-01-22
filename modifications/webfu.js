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
  authors.forEach(img => {
    let name = img.src.substring(img.src.lastIndexOf('/') + 1);
    name = name.replace('.jpg', '');
    name = name.replace('.png', '');
    const p = document.createElement('p');
    p.textContent = name;
    p.classList.add('docs-migration-tool-author');
    document.body.appendChild(p);
  });
  let next = document.querySelector('#feedback');
  let previous;
  do {
    previous = next;
    next = next.nextElementSibling;
    previous.remove();
} while (next.nextElementSibling);
  // Convert videos into a format that we can detect.
  const videos = [].slice.call(document.querySelectorAll('devsite-youtube'));
  videos.forEach(video => {
    const p = document.createElement('p');
    p.textContent = video.getAttribute('video-id');
    p.classList.add('docs-migration-tool-video');
    video.parentNode.parentNode.insertBefore(p, video.parentNode);
    video.parentNode.remove();
  });
  window.modificationsDone = true;
})();