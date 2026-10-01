// กองช่าง เทศบาลตำบลสีแก้ว — shared page behaviour
(function () {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  var toggle = document.getElementById('sidebar-toggle');

  function setOpen(open) {
    sidebar.classList.toggle('-translate-x-full', !open);
    backdrop.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(sidebar.classList.contains('-translate-x-full'));
  });
  backdrop.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // Prototype placeholders: buttons and "#" links show a notice instead of jumping to top.
  var toast = document.createElement('div');
  toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-tertiary text-surface px-4 py-2 rounded-lg shadow-lg text-sm transition-opacity duration-300 opacity-0 pointer-events-none';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  var timer;
  function notify(label) {
    toast.textContent = (label ? label + ' — ' : '') + 'ฟังก์ชันนี้อยู่ระหว่างพัฒนา';
    toast.classList.remove('opacity-0');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.add('opacity-0'); }, 2200);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('a[href="#"], main button, header button:not(#sidebar-toggle)');
    if (!el) return;
    e.preventDefault();
    var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
    // Drop leading Material Symbols ligature names (e.g. "add_circle")
    label = label.replace(/^([a-z_]+\s*)+/, '').slice(0, 40);
    notify(label);
  });
})();
