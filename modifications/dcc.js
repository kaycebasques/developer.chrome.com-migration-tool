// Wrap each <pre class="prettyprint"> element in a <code> element
// so that the Markdown converting tool formats them properly as codeblocks.
document.querySelectorAll('pre.prettyprint').forEach(target => {
  const code = document.createElement('code');
  code.innerHTML = target.innerHTML;
  target.innerHTML = '';
  target.appendChild(code);
});