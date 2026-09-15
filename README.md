# Freightcom Label Desk

A single-page shipping label maker for personal Freightcom shipments. Type the
recipient address, hit print, get a 4x6 label — and a Freightcom-ready shipment
payload when you're ready to book through the API.

## Run it

No build step, no dependencies. Open `index.html` in a browser, or serve it:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Defaults

Anything you leave blank falls back to the saved default:

| Field | Default |
| --- | --- |
| Box | 4 x 4 x 4 in |
| Weight | 0.55 lb |
| Contents | Glass figurine |
| Declared value | $5.00 CAD |
| Insurance | off |

Change them under **Ship-from & defaults**, along with your return address.

## What it produces

- **A 4x6 label** with from/to blocks, dimensions, weight, declared value,
  FRAGILE / THIS SIDE UP stamps, and a real Code 128 barcode encoding your
  reference number. `Print label` sets a 4x6 page size for a thermal printer.
- **A Freightcom shipment payload** matching the Customer API `POST /rate`
  shape — origin, destination, `packaging_type: "package"`, per-box
  measurements in lb/in, optional insurance, and a customs invoice block for
  cross-border shipments. Copy it or download it as JSON.

`service_id` and `payment_method_id` are left blank: those come from your own
Freightcom account. Verify field names against
[developer.freightcom.com](https://developer.freightcom.com/) for your API
version before booking.

This label is your own packing/address label, not a carrier-scannable one. A
carrier label comes back from Freightcom once a shipment is actually booked.

## Storage

Shipments and settings are saved in the browser (`localStorage`). Published as
an Artifact on claude.ai, it also persists them server-side so they follow you
across devices. The optional API key field never leaves the browser.
