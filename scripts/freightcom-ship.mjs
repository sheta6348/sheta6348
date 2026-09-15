#!/usr/bin/env node
/**
 * Opens Freightcom, logs in, starts a new shipment, and fills in the
 * Shipping From side and the packaging defaults. Then it hands the browser
 * over to you so you can type the recipient details and book.
 *
 * Usage:
 *   node freightcom-ship.mjs            reuse the saved login
 *   node freightcom-ship.mjs --fresh    forget the saved login and sign in again
 *   node freightcom-ship.mjs --close    close the browser when the form is filled
 *
 * The selectors below are written against the Freightcom shipping form as of
 * this writing. If the site changes and a field stops filling, the script says
 * exactly which one it could not find — that label is what needs updating.
 */

import { chromium } from "playwright";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = join(HERE, ".auth");
const CONFIG_PATH = join(HERE, "config.local.json");

const args = new Set(process.argv.slice(2));
const FRESH = args.has("--fresh");
const CLOSE_WHEN_DONE = args.has("--close");

/* ---------------------------------------------------------------- config */

if (!existsSync(CONFIG_PATH)) {
  console.error(
    "\nNo config.local.json found.\n\n" +
      "Copy config.example.json to config.local.json and fill in your ship-from\n" +
      "address, then run this again. That file stays on your computer — it is\n" +
      "listed in .gitignore so it never gets pushed to GitHub.\n",
  );
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const from = cfg.shipFrom;
const pkg = cfg.packaging;
const email = process.env.FREIGHTCOM_EMAIL || cfg.credentials?.email || "";
const password = process.env.FREIGHTCOM_PASSWORD || cfg.credentials?.password || "";

/* ------------------------------------------------------------- utilities */

const log = (msg) => console.log(msg);
const warn = (msg) => console.warn("  ! " + msg);

/**
 * Fill a field by the visible label above it, falling back to the
 * placeholder and then to a positional lookup. Freightcom's form does not
 * always wire labels to inputs, so one strategy is not enough.
 */
async function fillField(scope, label, value, { placeholder } = {}) {
  if (value === undefined || value === null || value === "") return true;
  const text = String(value);
  const labelRe = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const candidates = [
    () => scope.getByLabel(labelRe).first(),
    placeholder ? () => scope.getByPlaceholder(placeholder, { exact: false }).first() : null,
    // A label element, then the first text input after it in the DOM.
    () =>
      scope
        .locator(
          `xpath=.//label[contains(normalize-space(.), ${xpathLiteral(label)})]/following::input[not(@type="checkbox") and not(@type="radio")][1]`,
        )
        .first(),
  ].filter(Boolean);

  for (const make of candidates) {
    try {
      const el = make();
      if ((await el.count()) === 0) continue;
      await el.waitFor({ state: "visible", timeout: 4000 });
      await el.fill("");
      await el.fill(text);
      await el.blur().catch(() => {});
      log(`  ${label}: ${text}`);
      return true;
    } catch {
      /* try the next strategy */
    }
  }
  warn(`could not find the "${label}" field — fill it in by hand`);
  return false;
}

/** Choose an option in a <select> by its visible text. */
async function selectField(scope, label, value) {
  if (!value) return true;
  const labelRe = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const candidates = [
    () => scope.getByLabel(labelRe).first(),
    () =>
      scope
        .locator(
          `xpath=.//label[contains(normalize-space(.), ${xpathLiteral(label)})]/following::select[1]`,
        )
        .first(),
  ];
  for (const make of candidates) {
    try {
      const el = make();
      if ((await el.count()) === 0) continue;
      await el.waitFor({ state: "visible", timeout: 4000 });
      await el.selectOption({ label: value });
      log(`  ${label}: ${value}`);
      return true;
    } catch {
      /* try the next strategy */
    }
  }
  warn(`could not set "${label}" to "${value}" — choose it by hand`);
  return false;
}

/** Escape a string for embedding in an XPath expression. */
function xpathLiteral(s) {
  if (!s.includes("'")) return `'${s}'`;
  if (!s.includes('"')) return `"${s}"`;
  return "concat('" + s.split("'").join(`', "'", '`) + "')";
}

/**
 * The innermost container that mentions "Shipping From" but not
 * "Shipping To", so label lookups can't wander into the recipient column.
 */
function shippingFromCard(page) {
  return page
    .locator(
      'xpath=//*[self::div or self::section or self::form]' +
        '[.//*[contains(normalize-space(.), "Shipping From")]]' +
        '[not(.//*[contains(normalize-space(.), "Shipping To")])]',
    )
    .last();
}

/* ------------------------------------------------------------------ main */

async function main() {
  if (FRESH && existsSync(AUTH_DIR)) {
    rmSync(AUTH_DIR, { recursive: true, force: true });
    log("Cleared the saved login — you'll sign in again.");
  }

  log("Opening Chrome…");
  const ctx = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    channel: "chrome", // your real Chrome; falls back below if not installed
    viewport: null,
    args: ["--start-maximized"],
  }).catch(() =>
    chromium.launchPersistentContext(AUTH_DIR, {
      headless: false,
      viewport: null,
      args: ["--start-maximized"],
    }),
  );

  const page = ctx.pages()[0] || (await ctx.newPage());
  page.setDefaultTimeout(30000);

  /* ---- 1. log in --------------------------------------------------- */

  log(`Going to ${cfg.loginUrl}`);
  await page.goto(cfg.loginUrl, { waitUntil: "domcontentloaded" });

  const onLoginPage = async () => /login|signin|sign-in/i.test(page.url());

  if (await onLoginPage()) {
    if (email && password) {
      log("Signing in…");
      await fillField(page, "Email", email, { placeholder: "mail" });
      await fillField(page, "Password", password, { placeholder: "assword" });
      await page
        .getByRole("button", { name: /log ?in|sign ?in|continue/i })
        .first()
        .click()
        .catch(() => warn("could not find the login button — click it yourself"));
    } else {
      log("\n  → Log in in the browser window. I'll wait.");
      log("    (Do this once; the session is remembered for next time.)\n");
    }
    await page.waitForURL((u) => !/login|signin|sign-in/i.test(u.toString()), {
      timeout: 5 * 60 * 1000,
    });
  }
  log("Logged in.");

  /* ---- 2. Ship → Create New Shipment -------------------------------- */

  log("Opening a new shipment…");
  const shipMenu = page.getByRole("link", { name: /^\s*Ship\s*$/i }).first();
  if (await shipMenu.count()) {
    await shipMenu.click().catch(() => {});
    await page.waitForTimeout(600);
  }
  const createLink = page
    .getByRole("link", { name: /create (a )?new shipment|new shipment/i })
    .first();
  if (await createLink.count()) {
    await createLink.click().catch(() => {});
  } else {
    warn("couldn't find the 'Create New Shipment' menu item — navigate there yourself");
  }

  // Wait for the shipment form, however we got there.
  await page
    .getByText(/Shipping From/i)
    .first()
    .waitFor({ state: "visible", timeout: 60000 })
    .catch(() => {
      warn("the shipment form didn't appear — open it yourself, then rerun with the form open");
    });

  /* ---- 3. packaging type -------------------------------------------- */

  if (pkg?.type) {
    const btn = page.getByRole("button", { name: new RegExp(`^\\s*${pkg.type}\\s*$`, "i") }).first();
    if (await btn.count()) {
      await btn.click().catch(() => {});
      log(`  Packaging type: ${pkg.type}`);
    } else {
      warn(`could not click the "${pkg.type}" packaging button`);
    }
  }

  /* ---- 4. Shipping From --------------------------------------------- */

  log("\nFilling Shipping From:");
  const card = shippingFromCard(page);
  const scope = (await card.count()) ? card : page;
  if (!(await card.count())) warn("couldn't isolate the Shipping From card; filling the first match of each field");

  await fillField(scope, "Company/Name", from.company);
  await fillField(scope, "Address 1", from.address1, { placeholder: "123 Address" });
  await fillField(scope, "Address 2", from.address2);
  await fillField(scope, "Unit/Floor", from.unit);
  await fillField(scope, "Postal Code", from.postalCode);
  await fillField(scope, "City", from.city, { placeholder: "City Name" });
  await selectField(scope, "Province", from.province);
  await selectField(scope, "Country", from.country);
  await fillField(scope, "Contact Name", from.contactName);
  await fillField(scope, "Phone Number", from.phone);
  await fillField(scope, "Ext", from.extension);
  await fillField(scope, "Email Address", from.email, { placeholder: "example.com" });

  const resid = scope.getByRole("checkbox", { name: /residential address/i }).first();
  if (await resid.count()) {
    const checked = await resid.isChecked().catch(() => false);
    if (checked !== !!from.residential) await resid.click().catch(() => {});
    log(`  Residential: ${from.residential ? "yes" : "no"}`);
  }

  /* ---- 5. packaging numbers ----------------------------------------- */

  log("\nFilling packaging defaults:");
  await fillField(page, "Length", pkg.lengthIn);
  await fillField(page, "Width", pkg.widthIn);
  await fillField(page, "Height", pkg.heightIn);
  await fillField(page, "Weight", pkg.weightLb);
  await fillField(page, "Description", pkg.description);
  await fillField(page, "Value", pkg.declaredValue);

  /* ---- 6. hand over -------------------------------------------------- */

  const toName = page
    .locator('xpath=//*[contains(normalize-space(.), "Shipping To")]/following::input[1]')
    .first();
  await toName.focus().catch(() => {});

  log("\nDone — the recipient fields are yours. The cursor is in Shipping To.");
  if (CLOSE_WHEN_DONE) {
    await ctx.close();
  } else {
    log("Leave this terminal window open; close the browser when you're finished.\n");
    await new Promise(() => {}); // keep the browser alive
  }
}

main().catch((err) => {
  console.error("\nSomething went wrong:\n" + err.message + "\n");
  process.exit(1);
});
