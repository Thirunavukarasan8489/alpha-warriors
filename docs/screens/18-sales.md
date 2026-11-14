# Screen 18 – Sales (products)

- **Route:** `/sales`
- **Phase:** 3
- **Roles:** owner, manager, receptionist (cost price hidden from receptionists)
- **Reads / writes:** `products`, `sales`, `payments`

## Purpose
Sell supplements and merchandise to members and walk-in guests, and track stock and profit.

## Layout
- Tabs: **New sale**, **History**, **Products**.
- New sale: search products, add to cart with quantity, choose member (search) or guest (name and phone), discount, payment modes (split rows as in `06-collect-payment.md`), **Complete sale**.
- Products: name, price, cost, stock, low-stock level, active.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Complete sale | Creates the sale and payment rows, reduces stock, shows receipt with **Share** (WhatsApp) | `POST /api/sales` |
| Add or edit product | Saves the product | `POST /api/products`, `PATCH /api/products/:id` |
| Adjust stock | Adds or removes stock with a reason | `POST /api/products/:id/stock` |
| Void sale | Owner and manager, restores stock, voids the payment | `POST /api/sales/:id/void` |

## Rules
- Stock cannot go below zero.
- Profit per sale = selling price minus cost. Shown to owner and manager only.
- Sale payments count in daily collection reports.

## Connects to
- **From:** "More" menu, `05-member-profile.md` (Sell to member, optional).
- **To:** `05-member-profile.md`, `11-reports.md`.

## Done when
- [x] Stock and sales always agree after voids.
- [x] Low-stock badge shows on the Products tab.
