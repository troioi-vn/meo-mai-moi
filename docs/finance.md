# Finances

Finances provides private, shared income and expense tracking for pet care. A **Ledger** is the internal authorization boundary; its user-visible title can be anything, and all active members have equal permissions.

## Core rules

- Ledgers have one currency. Amounts are stored as positive integer minor units and direction comes from `income` or `expense`.
- Currency can change only before the first transaction, including soft-deleted history.
- Pet and Group access never implies finance access, and Ledger membership never grants access to pet profiles or health records.
- Accounts are labels for where money moved. Their totals are called **net activity**, never balance.
- Accounts, categories, pets, and memberships retain history when archived or ended.
- Receipts use a single-file private Media Library collection and an authorized download endpoint.

## First use

`/finance` is always visible to verified users. No default Ledger is created until the user completes setup. Setup atomically creates the Ledger, creator membership, localized Cash account, and localized starter categories.

## Collaboration and integrations

Ledger invitations use the shared `/invite/:token` flow and expire after seven days. A Ledger may optionally link one Group and synchronize Group pet availability without synchronizing members. Selected health record create requests can include `finance_expense`; record, transaction, pet availability, and health link are then created atomically.

Deleting a linked health record requires `linked_transaction=keep|delete`. Direct transaction deletion only removes the link; it never deletes the health record.

## Administration

The seeded ISO 4217 catalogue is managed under **Finance currencies** in Filament. Disabling a currency prevents new selection but does not invalidate existing Ledgers. Codes and minor-unit precision are immutable in the admin UI.
