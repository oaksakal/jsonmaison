export interface ToastManager {
  show: (message: string) => void;
}

export function createToastManager(container: HTMLElement): ToastManager {
  let counter = 0;

  return {
    show(message) {
      counter += 1;
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toast.dataset.id = String(counter);

      container.appendChild(toast);

      window.setTimeout(() => {
        toast.classList.add('toast-hide');
      }, 1800);

      window.setTimeout(() => {
        toast.remove();
      }, 2200);
    }
  };
}
