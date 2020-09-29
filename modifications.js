window.fixCodeBlocks = target => {
  const code = document.createElement('code');
  code.innerHTML = target.innerHTML;
  target.innerHTML = '';
  target.appendChild(code);
};