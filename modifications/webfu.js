(async () => {
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
  document.querySelector('h1').insertAdjacentElement('afterend', dateNode);
  // Get the last update.
  const updateStart = text.search(/wf_updated_on:/);
  const updateEnd = text.substring(updateStart).search(/\s+#}/);
  const updateValue = text.substring(updateStart, updateStart + updateEnd).replace(/wf_updated_on:\s+/, '');
  const updateNode = document.createElement('p');
  updateNode.id = 'docs-migration-tool-update';
  updateNode.textContent = updateValue;
  document.querySelector('h1').insertAdjacentElement('afterend', updateNode);
})();