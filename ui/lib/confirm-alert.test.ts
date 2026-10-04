// customers#95: a delete confirmation a screen reader can find. The question is an Ionic
// `<ion-alert>` — Ionic paints it with `role="alertdialog"`, its header as the accessible name,
// moves the focus into it and traps it there — appended to `document.body`: an inline `<ion-alert>`
// inside a shadow root loses its styles when Ionic teleports it and, the first time in a session,
// its backdrop covers its own buttons (hub#2162; same recipe as kitchen#115 and appointments#207).
//
// These tests drive the element the way Ionic does without loading Ionic: `present()` when the
// component is defined, `isOpen` otherwise, and `ionAlertDidDismiss` when it closes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { presentConfirmAlert } from './confirm-alert';

type AlertButton = { text: string; role?: string; htmlAttributes?: Record<string, string>; handler?: () => unknown };
type AlertEl = HTMLElement & { header: string; message: string; buttons: AlertButton[]; isOpen?: boolean };

const alerts = (): AlertEl[] => [...document.body.querySelectorAll('ion-alert')] as AlertEl[];
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function open(onDismiss = vi.fn(), onConfirm = vi.fn()) {
  const handle = presentConfirmAlert({
    htmlAttributes: { 'data-testid': 'x-delete-confirm' },
    header: 'Delete customer',
    message: 'Delete <b>Ada</b> & co?',
    buttons: [
      { text: 'Cancel', role: 'cancel', htmlAttributes: { 'data-testid': 'x-delete-cancel' } },
      { text: 'Delete', role: 'destructive', htmlAttributes: { 'data-testid': 'x-delete-submit' }, handler: onConfirm },
    ],
    onDismiss,
  });
  return { handle, onDismiss, onConfirm };
}

function dismissAs(alert: AlertEl, role: string): void {
  alert.dispatchEvent(new CustomEvent('ionAlertDidDismiss', { detail: { role } }));
}

beforeEach(() => {
  alerts().forEach((a) => a.remove());
});

describe('customers#95 · presentConfirmAlert', () => {
  it('opens ONE ion-alert on document.body, with the header, the message as given and its hooks', () => {
    open();
    expect(alerts()).toHaveLength(1);
    const [alert] = alerts();
    expect(alert.parentElement, 'global overlay, never inside a shadow root (hub#2162)').toBe(document.body);
    expect(alert.isOpen, 'without Ionic loaded it is opened through isOpen').toBe(true);
    expect(alert.getAttribute('data-testid')).toBe('x-delete-confirm');
    expect(alert.header).toBe('Delete customer');
    // Ionic 8 renders `message` as TEXT (innerHTMLTemplatesEnabled is off): escaping it here would
    // print «&amp;» to the person.
    expect(alert.message).toBe('Delete <b>Ada</b> & co?');
    expect(alert.buttons.map((b) => [b.role, b.text, b.htmlAttributes?.['data-testid']])).toEqual([
      ['cancel', 'Cancel', 'x-delete-cancel'],
      ['destructive', 'Delete', 'x-delete-submit'],
    ]);
  });

  it('presents it through Ionic when the element is upgraded', async () => {
    const present = vi.fn(async () => {});
    const spy = vi.spyOn(document, 'createElement');
    spy.mockImplementationOnce((tag: string) => {
      const el = Document.prototype.createElement.call(document, tag) as AlertEl & { present: () => Promise<void> };
      el.present = present;
      return el;
    });
    open();
    spy.mockRestore();
    await tick();
    expect(present).toHaveBeenCalledTimes(1);
  });

  it('the destructive button runs its handler; closing reports the dismissal and removes the element', async () => {
    const { onConfirm, onDismiss } = open();
    const [alert] = alerts();
    alert.buttons.find((b) => b.role === 'destructive')?.handler?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    dismissAs(alert, 'destructive');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await tick();
    expect(alerts(), 'no hidden alert is left behind').toEqual([]);
  });

  it('Esc / backdrop only dismiss: nothing is confirmed', async () => {
    const { onConfirm, onDismiss } = open();
    dismissAs(alerts()[0], 'backdrop');
    await tick();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(alerts()).toEqual([]);
  });

  it('is removed even when Ionic puts the teleported overlay back AFTER emitting the dismissal', async () => {
    open();
    const [alert] = alerts();
    alert.addEventListener('ionAlertDidDismiss', () => {
      void Promise.resolve().then(() => document.body.appendChild(alert));
    });
    dismissAs(alert, 'cancel');
    await tick();
    expect(alerts()).toEqual([]);
  });

  it('dismiss() closes it from the code (the sheet closed, the screen left) and reports it once', async () => {
    const { handle, onDismiss } = open();
    handle.dismiss();
    handle.dismiss();
    await tick();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(alerts()).toEqual([]);
  });

  it('dismiss() goes through Ionic when the element is upgraded', async () => {
    const dismiss = vi.fn(async () => true);
    const spy = vi.spyOn(document, 'createElement');
    spy.mockImplementationOnce((tag: string) => {
      const el = Document.prototype.createElement.call(document, tag) as AlertEl & { dismiss: () => Promise<boolean> };
      el.dismiss = dismiss;
      return el;
    });
    const { handle } = open();
    spy.mockRestore();
    handle.dismiss();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss() before Ionic finished presenting (it answers false) still closes it', async () => {
    const spy = vi.spyOn(document, 'createElement');
    spy.mockImplementationOnce((tag: string) => {
      const el = Document.prototype.createElement.call(document, tag) as AlertEl & { dismiss: () => Promise<boolean> };
      el.dismiss = async () => false;
      return el;
    });
    const { handle, onDismiss } = open();
    spy.mockRestore();
    handle.dismiss();
    await tick();
    await tick();
    expect(alerts()).toEqual([]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a present() that fails leaves nothing open and reports the dismissal', async () => {
    const spy = vi.spyOn(document, 'createElement');
    spy.mockImplementationOnce((tag: string) => {
      const el = Document.prototype.createElement.call(document, tag) as AlertEl & { present: () => Promise<void> };
      el.present = async () => {
        throw new Error('overlay failed');
      };
      return el;
    });
    const { onDismiss } = open();
    spy.mockRestore();
    await tick();
    await tick();
    expect(alerts()).toEqual([]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
