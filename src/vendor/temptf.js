'use strict';

/**
 * temp.tf backend — real Microsoft-family mailboxes with a JSON reader.
 *
 * Why this one: the sign-up gate in front of console.river.ai only refuses
 * *disposable* domains; a genuine `@hotmail.com` / `@outlook.com` address is not
 * on that list, and it is also the address family the operator measured to skip
 * the phone screen entirely (2026-10-18, `rv_KUqA0…`). temp.tf hands out plus
 * aliases on its own pool of real provider accounts, so the domain is Microsoft's
 * own while the local-part tag keeps the mailbox private to one caller:
 *
 *   GET  /api/account?providers=outlook,hotmail&dot=0&plus=1  -> {email}
 *   POST /api/check  {email, wait}                            -> {data:[…]}
 *   GET  /api/attachment?email=&messageId=&attachmentId=      -> bytes
 *   GET  /api/stats?providers=…                               -> {totalReceived}
 *
 * Measured 2026-10-18: `/api/account` answered
 * `{"email":"maricruzkasuba5465+jb4gq9dd66@hotmail.com"}` and `/api/check`
 * answered `{"data":[],"totalReceived":4740775}`, so both the address and the
 * reader work without a browser, a Cloudflare cookie or a captcha.
 *
 * Rate limit: the account route is throttled per IP (`429` + `Retry-After`,
 * measured ~20 s per issued address on this line). One address per mint, and a
 * 429 is retried after the advertised delay rather than burning the attempt.
 *
 * Same shape as Mailtrap / MailTM / TempMailIo for provisionAccount():
 *   createAccount() -> { address }
 *   waitForCode()   -> the 6-digit code
 */

const { fetchText } = require('./proxy');
const { extractCode, allStrings } = require('./mailtrap');

const BASE = 'https://temp.tf';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class TempTf {
  /**
   * @param {{proxy?: object|null, providers?: string[], plus?: boolean, log?: Function, timeoutMs?: number}} opts
   */
  constructor({ proxy = null, providers = ['outlook', 'hotmail'], plus = true, dot = false, address = null, log = () => {}, timeoutMs = 30000 } = {}) {
    this.proxy = proxy;
    this.providers = providers;
    this.plus = plus;
    this.dot = dot;
    this.preset = address;
    this.log = log;
    this.timeoutMs = timeoutMs;
    this.address = null;
  }

  async call(method, path_, { body, tries = 4 } = {}) {
    const url = `${BASE}${path_}`;
    for (let attempt = 0; ; attempt++) {
      // fetchText resolves the decoded body only (status lives on the socket), so
      // a throttle is detected from the empty/limiter body rather than a code.
      const text = await fetchText(this.proxy, url, {
        method,
        timeoutMs: this.timeoutMs,
        headers: {
          'user-agent': UA,
          accept: 'application/json',
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = null;
      }
      if (json === null) {
        if (attempt < tries) {
          await sleep(8000 * (attempt + 1));
          continue;
        }
        throw new Error(`temp.tf ${method} ${path_}: unreadable body ${String(text).slice(0, 160)}`);
      }
      if (json.error) {
        const detail = String(json.error);
        if (/too many|rate|limit/i.test(detail) && attempt < tries) {
          const ms = 10000 * (attempt + 1);
          this.log(`temp.tf: throttled (${detail}), retrying in ${Math.round(ms / 1000)}s`);
          await sleep(ms);
          continue;
        }
        throw new Error(`temp.tf ${method} ${path_}: ${detail}`);
      }
      return json;
    }
  }

  /** Fresh plus alias on a live Microsoft mailbox. */
  async createAccount({ providers = this.providers } = {}) {
    // A caller that already holds an alias (re-testing one address, or a dot
    // variant issued outside the module) skips the throttled allocation route.
    if (this.preset) {
      this.address = this.preset;
      this.log(`temp.tf: ${this.address} (preset)`);
      return { address: this.address };
    }
    const q = new URLSearchParams({
      providers: providers.join(','),
      dot: this.dot ? '1' : '0',
      plus: this.plus ? '1' : '0',
    }).toString();
    const json = await this.call('GET', `/api/account?${q}`);
    const address = String((json && json.email) || '').trim();
    if (!/@/.test(address)) throw new Error(`temp.tf: no address in ${JSON.stringify(json).slice(0, 160)}`);
    this.address = address;
    this.log(`temp.tf: ${address}`);
    return { address };
  }

  /** Inbox messages, newest first, normalised to the `{id, subject, from, text}` shape. */
  async messages() {
    if (!this.address) throw new Error('temp.tf: createAccount() first');
    const json = await this.call('POST', '/api/check', { body: { email: this.address, wait: false } });
    const list = Array.isArray(json) ? json : json && (json.data || json.messages);
    if (!Array.isArray(list)) return [];
    return list.map((m, i) => {
      const text = String(
        m.text || m.textBody || m.plain || m.body || m.html || m.htmlBody || m.snippet || m.preview || ''
      );
      return {
        id: String(m.id || m.messageId || i),
        subject: String(m.subject || m.title || ''),
        from: String(m.from || m.sender || (m.fromAddress && (m.fromAddress.address || m.fromAddress)) || ''),
        text: text.replace(/<[^>]+>/g, ' '),
        raw: m,
      };
    });
  }

  /**
   * Polls until a message carries a 6-digit code.
   *
   * @param {{timeoutMs?: number, pollMs?: number, subjectIncludes?: string, match?: Function, log?: Function}} opts
   */
  async waitForCode({ timeoutMs = 180000, pollMs = 5000, subjectIncludes = null, match = null, log } = {}) {
    if (!this.address) throw new Error('temp.tf: createAccount() first');
    const say = log || this.log;
    const wanted = subjectIncludes ? String(subjectIncludes).toLowerCase() : null;
    const deadline = Date.now() + timeoutMs;
    const seen = new Set();
    while (Date.now() < deadline) {
      const list = await this.messages();
      for (const m of list) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        const accepts =
          (!wanted || m.subject.toLowerCase().includes(wanted)) && (!match || match(m));
        if (!accepts) {
          say(`temp.tf: skipped "${m.subject.slice(0, 40)}"`);
          continue;
        }
        const code = extractCode(m.text) || extractCode(allStrings(m.raw));
        if (code) {
          say(`temp.tf: code ${code} ("${m.subject.slice(0, 40)}")`);
          return code;
        }
        say(`temp.tf: message without a code ("${m.subject.slice(0, 40)}")`);
      }
      await sleep(pollMs);
    }
    throw new Error(`temp.tf: no verification code for ${this.address} within ${Math.round(timeoutMs / 1000)}s`);
  }

  /** The alias is a plus tag on a pool mailbox; nothing to release. */
  close() {
    this.address = null;
  }
}

module.exports = { TempTf };
