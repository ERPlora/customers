/**
 * A confirmation a screen reader can find (customers#95): an Ionic `<ion-alert>` — painted with
 * `role="alertdialog"`, named by its header, focus moved into it and trapped — appended to
 * `document.body`. Never an inline `<ion-alert>` in a component's shadow root: it loses its styles
 * when Ionic teleports it, and the first time in a session its backdrop covers its own buttons
 * (hub#2162; same recipe as kitchen#115 and appointments#207).
 *
 * The options mirror Ionic's `AlertOptions`, so a call reads like Ionic: `htmlAttributes` carries
 * the QA hooks of the dialog and of each button.
 */

export interface ConfirmAlertButton {
  text: string;
  role?: 'cancel' | 'destructive';
  htmlAttributes?: Record<string, string>;
  handler?: () => void;
}

export interface ConfirmAlertOptions {
  header: string;
  /** Rendered as TEXT by Ionic 8 (`innerHTMLTemplatesEnabled` is off): pass it unescaped. */
  message: string;
  buttons: ConfirmAlertButton[];
  htmlAttributes?: Record<string, string>;
  /** Called once when the dialog closes, whatever closed it (a button, Esc, the backdrop, `dismiss()`). */
  onDismiss: () => void;
}

export interface ConfirmAlert {
  /** Closes the dialog from the code (the sheet it asks about closed, the screen was left). */
  dismiss(): void;
}

/** The slice of Ionic's `<ion-alert>` this drives. */
type IonicAlertElement = HTMLElement & {
  header: string;
  message: string;
  buttons: ConfirmAlertButton[];
  isOpen?: boolean;
  present?: () => Promise<void>;
  dismiss?: () => Promise<boolean>;
};

export function presentConfirmAlert(options: ConfirmAlertOptions): ConfirmAlert {
  const alert = document.createElement('ion-alert') as IonicAlertElement;
  alert.header = options.header;
  alert.message = options.message;
  alert.buttons = options.buttons;
  for (const [name, value] of Object.entries(options.htmlAttributes ?? {})) alert.setAttribute(name, value);

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    // Ionic moves the teleported overlay back to its original parent right AFTER emitting
    // ionAlertDidDismiss: remove it on the next task or a hidden alert is left on every question.
    setTimeout(() => alert.remove(), 0);
    options.onDismiss();
  };
  alert.addEventListener('ionAlertDidDismiss', close, { once: true });
  document.body.appendChild(alert);

  if (typeof alert.present === 'function') {
    alert.present().catch(() => {
      alert.remove();
      close();
    });
  } else {
    alert.isOpen = true;
  }

  return {
    dismiss(): void {
      if (closed) return;
      if (typeof alert.dismiss === 'function') {
        // `false` = Ionic had not finished presenting it: take it out by hand, or it opens later.
        void alert
          .dismiss()
          .then((dismissed) => {
            if (!dismissed) {
              alert.remove();
              close();
            }
          })
          .catch(() => {
            alert.remove();
            close();
          });
        return;
      }
      alert.isOpen = false;
      close();
    },
  };
}
