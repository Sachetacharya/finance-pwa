let lockCount = 0;
let savedScrollY = 0;

export function lockBodyScroll(): void {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${savedScrollY}px`;
  }
  lockCount++;
}

export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
  }
}
