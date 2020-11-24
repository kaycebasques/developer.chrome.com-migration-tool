// Wrap each <pre class="prettyprint"> element in a <code> element
// so that the Markdown converting tool formats them properly as codeblocks.
document.querySelectorAll('pre.prettyprint').forEach(target => {
  const code = document.createElement('code');
  code.innerHTML = target.innerHTML;
  target.innerHTML = '';
  target.appendChild(code);
});
// Convert <code><a href="…">Content</a></code> into <a href="…"><code>Content</code></a>
const badCodeLinks = [].slice.call(document.querySelectorAll('code > a'));
for (let i = 0; i < badCodeLinks.length; i++) {
  const target = badCodeLinks[i];
  if (target.closest('pre')) continue;
  const a = document.createElement('a');
  a.href = target.href;
  const code = document.createElement('code');
  code.textContent = target.textContent;
  a.appendChild(code);
  target.parentNode.parentNode.replaceChild(a, target.parentNode);
}
// Convert note elements
// [].slice.call(document.querySelectorAll('p.note')).forEach(note => {
//   const div = document.createElement('div');
//   div.classList.add('aside');
//   div.classList.add('aside--note');
//   div.innerHTML = note.innerHTML;
//   note.replaceWith(div);
// });
// Convert caution elements
// [].slice.call(document.querySelectorAll('p.caution')).forEach(item => {
//   const div = document.createElement('div');
//   div.classList.add('aside');
//   div.classList.add('aside--caution');
//   div.innerHTML = item.innerHTML;
//   item.replaceWith(div);
// });
// Convert warning elements
// [].slice.call(document.querySelectorAll('p.warning')).forEach(item => {
//   const div = document.createElement('div');
//   div.classList.add('aside');
//   div.classList.add('aside--warning');
//   div.innerHTML = item.innerHTML;
//   item.replaceWith(div);
// });
// Flag images
[].slice.call(document.querySelectorAll('img')).forEach(img => {
  const p = document.createElement('p');
  p.textContent = 'TODO convert image';
  img.insertAdjacentElement('beforebegin', p);
});
// Flag definition lists
// Note: these flags can be configurable. Specify whether you just need before or after
// LEt them provide the description
[].slice.call(document.querySelectorAll('dl')).forEach(dl => {
  const p1 = document.createElement('p');
  p1.textContent = 'TODO clean up definition list';
  dl.insertAdjacentElement('beforebegin', p1);
  const p2 = document.createElement('p');
  p2.textContent = 'TODO end of definition list';
  dl.insertAdjacentElement('afterend', p2);
});