# Prompt for handing this task to another AI assistant

Copy everything between the lines. Replace the bracketed placeholders with your
own details before sending — and do not paste your password into a chat
assistant; leave that for the local config file.

---

I want a script I can run on my own computer that automates the start of a
shipment on Freightcom. I am not a programmer, so give me copy-paste commands
and explain each step.

**What it should do, in order:**

1. Open a real Chrome window (visible, not headless) so I can watch it work.
2. Go to https://live.freightcom.com/login and log into my Freightcom business
   account. I'd prefer to log in by hand the first time and have the script
   remember my session afterwards, so my password is never stored — use
   Playwright's persistent browser profile for this. Give me an option to clear
   that saved session and sign in fresh.
3. Click **Ship** in the top navigation, then **Create New Shipment**.
4. On the shipment form, set **Packaging Type** to **Package**.
5. Fill in only the **Shipping From** column with these values:
   - Company/Name: [YOUR COMPANY NAME]
   - Address 1: [YOUR STREET ADDRESS]
   - Postal Code: [YOUR POSTAL CODE]
   - City: [YOUR CITY]
   - Province: [YOUR PROVINCE]
   - Country: [YOUR COUNTRY]
   - Residential Address: unchecked
   - Contact Name: [YOUR NAME]
   - Phone Number: [YOUR PHONE]
   - Email Address: [YOUR EMAIL]
6. Fill the package defaults: [L] x [W] x [H] inches, [WEIGHT] lb, declared
   value $[VALUE] CAD, description "[WHAT YOU SHIP]".
7. Stop there. Put the cursor in the Shipping To company field and leave the
   browser open — I type the recipient details and book the shipment myself.

**Requirements:**

- Node.js with Playwright. Give me the exact `npm install` commands.
- Put my address and any credentials in a separate local config file, not in
  the script, and add that file to `.gitignore` — my repository is public.
- Freightcom's form is a JavaScript app and its labels are not always wired to
  their inputs, so look fields up by their visible label text with fallbacks
  (label-to-following-input XPath, placeholder text). Scope the Shipping From
  lookups to the Shipping From card only, otherwise they will match the
  Shipping To fields, which use identical labels.
- Print each field as it is filled, and print a clear warning naming any field
  that could not be found instead of crashing.
- Handle the case where I am already logged in and the site skips the login page.

---
