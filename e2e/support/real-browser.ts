import { ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BLOCKED = ['googletagmanager.com', 'google-analytics.com', 'analytics.google.com', 'quranflash.com', 'youtube.com', 'youtube-nocookie.com', 'ytimg.com'];

// Page-side helpers: the visible element matching a selector and text, and the deepest element showing a text.
const FIND = `((sel, text) => [...document.querySelectorAll(sel)].find((el) => el.getClientRects().length > 0 && (!text || el.textContent.replace(/\\s+/g, ' ').includes(text))))`;
const FIND_TEXT = `((text) => [...document.querySelectorAll('body *')].filter((el) => el.getClientRects().length > 0 && el.textContent.replace(/\\s+/g, ' ').includes(text)).pop())`;

/**
 * A real Chromium of any age, driven over the DevTools protocol: Playwright needs engines newer than
 * the oldest phones the app supports, so this covers just what the old-engine checks need.
 */
export class RealBrowser {
  readonly errors: string[] = [];
  version = '';
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

  private constructor(private proc: ChildProcess, private ws: WebSocket, private browserWs: string, private profile: string) {
    ws.addEventListener('message', (event) => this.onMessage(JSON.parse(String(event.data))));
  }

  static async launch(executable: string, options: { port: number; x64?: boolean }): Promise<RealBrowser> {
    const profile = mkdtempSync(join(tmpdir(), 'real-browser-'));
    const args = ['--headless', '--disable-gpu', `--remote-debugging-port=${options.port}`, '--remote-allow-origins=*',
      `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', 'about:blank'];
    const proc = options.x64 ? spawn('arch', ['-x86_64', executable, ...args], { stdio: 'ignore' }) : spawn(executable, args, { stdio: 'ignore' });
    const base = `http://127.0.0.1:${options.port}`;
    let version: any;
    let target: any;
    for (const deadline = Date.now() + 60_000; Date.now() < deadline && !target; ) {
      try {
        version = await (await fetch(`${base}/json/version`)).json();
        target = (await (await fetch(`${base}/json/list`)).json()).find((t: any) => t.type === 'page');
      } catch {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    if (!target) {
      proc.kill();
      throw new Error(`${executable} did not start`);
    }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const browser = new RealBrowser(proc, ws, version.webSocketDebuggerUrl, profile);
    browser.version = version.Browser;
    for (const domain of ['Page', 'Runtime', 'Log', 'Network']) {
      await browser.send(`${domain}.enable`);
    }
    await browser.send('Network.setBlockedURLs', { urls: BLOCKED.map((host) => `*${host}*`) });
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    return browser;
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  private onMessage(message: any): void {
    if (message.id) {
      const call = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) call?.reject(new Error(message.error.message));
      else call?.resolve(message.result);
      return;
    }
    const { method, params } = message;
    if (method === 'Runtime.exceptionThrown') {
      const details = params.exceptionDetails;
      this.errors.push(`uncaught: ${(details.exception?.description ?? details.text).split('\n')[0]}`);
    } else if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
      this.errors.push(`console.error: ${params.args.map((a: any) => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`);
    } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
      const text = `${params.entry.text} ${params.entry.url ?? ''}`;
      if (!/ERR_BLOCKED_BY_CLIENT/.test(text)) this.errors.push(`log: ${text.trim().slice(0, 200)}`);
    }
  }

  async evaluate<T = any>(expression: string): Promise<T> {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }

  async waitFor(expression: string, what: string, timeout = 20_000): Promise<void> {
    for (const deadline = Date.now() + timeout; Date.now() < deadline; ) {
      if (await this.evaluate(`Promise.resolve(${expression}).then((value) => !!value)`).catch(() => false)) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  /** Opens a path with exactly the given localStorage (set from a static file, before the app boots). */
  async open(origin: string, path: string, storage: Record<string, unknown> = {}): Promise<void> {
    await this.navigate(`${origin}/robots.txt`);
    const entries = Object.fromEntries(Object.entries(storage).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
    await this.evaluate(`localStorage.clear(); sessionStorage.clear(); Object.entries(${JSON.stringify(entries)}).forEach(([k, v]) => localStorage.setItem(k, v))`);
    await this.navigate(`${origin}${path}`);
  }

  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url });
    await this.waitFor(`document.readyState === 'complete' && location.href.startsWith(${JSON.stringify(url.split('?')[0])})`, `load of ${url}`);
  }

  async see(selector: string, text = ''): Promise<void> {
    await this.waitFor(`${FIND}(${JSON.stringify(selector)}, ${JSON.stringify(text)})`, `${selector} "${text}"`);
  }

  async click(selector: string, text = ''): Promise<void> {
    await this.see(selector, text);
    await this.evaluate(`${FIND}(${JSON.stringify(selector)}, ${JSON.stringify(text)}).click()`);
  }

  async clickText(text: string): Promise<void> {
    await this.waitFor(`${FIND_TEXT}(${JSON.stringify(text)})`, `text "${text}"`);
    await this.evaluate(`${FIND_TEXT}(${JSON.stringify(text)}).click()`);
  }

  async fill(label: string, value: string): Promise<void> {
    const field = `${FIND}('mat-form-field', ${JSON.stringify(label)}).querySelector('input, textarea')`;
    await this.waitFor(field, `field "${label}"`);
    await this.evaluate(`(() => { const input = ${field}; input.focus(); input.value = ${JSON.stringify(value)};
      input.dispatchEvent(new Event('input', { bubbles: true })); input.blur(); })()`);
  }

  async screenshot(path: string): Promise<void> {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path, Buffer.from(data, 'base64'));
  }

  async close(): Promise<void> {
    const exited = new Promise((resolve) => this.proc.once('exit', resolve));
    try {
      const ws = new WebSocket(this.browserWs);
      await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
      ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    } catch {
      this.proc.kill();
    }
    await Promise.race([exited, new Promise((r) => setTimeout(r, 10_000))]);
    if (this.proc.exitCode === null) this.proc.kill();
    this.ws.close();
    rmSync(this.profile, { recursive: true, force: true });
  }
}
