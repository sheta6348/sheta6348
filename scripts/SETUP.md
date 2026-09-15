# Setting this up (one time)

You need [Node.js](https://nodejs.org/) — download the "LTS" version and install
it like any other app.

Then open **Terminal** (Mac) or **Command Prompt** (Windows) and run these four
lines, one at a time:

```
cd path/to/this/folder/scripts
npm install
npm run setup
cp config.example.json config.local.json
```

On Windows the last line is `copy config.example.json config.local.json`.

Open `config.local.json` in any text editor and fill in your ship-from address.
That file stays on your computer — it is gitignored, so it never goes to GitHub.

You can leave `email` and `password` blank. The first time you run the script it
opens Chrome and waits for you to log in by hand; after that it remembers you.
That is the safer option and it works even with two-factor login. If you would
rather it type your password for you, put it in `config.local.json`, or set
`FREIGHTCOM_EMAIL` and `FREIGHTCOM_PASSWORD` as environment variables.

# Using it

```
cd path/to/this/folder/scripts
npm run ship
```

Chrome opens, logs into Freightcom, starts a new shipment, sets the packaging
type to Package, and fills in your Shipping From details plus the 4x4x4 in /
0.55 lb / $5 defaults. Then it stops and puts the cursor in the Shipping To
company field — you type the recipient in and book the shipment yourself.

To sign out and start clean:

```
npm run ship:fresh
```

# If a field doesn't fill

The script prints each field as it fills it, and prints a line starting with `!`
for any it could not find. Freightcom changes its form from time to time; when
that happens the label in the `!` line is the one that needs updating in
`freightcom-ship.mjs`. Send me that line and I'll fix it.
