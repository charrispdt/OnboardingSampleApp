# Proposal 001: Customer Setup and Onboarding Plan

**Status:** Draft
**Author:** Christopher Harris
**Date:** 2026-10-27

## Problem

CS can't keep up with the onboarding queue. Today the app shows one hard-coded customer (Acme) and four placeholder tabs. Every new customer arrives with its own CSV layout (see [sample-data/README.md](../../sample-data/README.md)), so CS works out column mappings, picklist translations and data problems by hand, every time, with nothing written down.

We get paid only after a customer is fully set up, so the first thing worth building is the step that turns a new customer into a **reviewed, repeatable onboarding plan**.

## Proposal

A CS user can:

1. **Set up a new customer.** Enter the customer's profile and point to the folder holding the customer's export files.
2. **Build an onboarding plan.** The app reads the files and drafts a plan with:
   - column mappings
   - value (picklist) mappings
   - format rules
   - data problems found
   - import order and checks

   The CS user reviews the draft and fixes anything the app couldn't map.
3. **Commit the plan to the repo.** The plan is saved as a JSON file under `onboarding-plans/` and committed on a branch, so it can be reviewed in a pull request, survives server restarts (the store is in-memory), and becomes the input to the later Tenant Setup and Import steps.

### Out of scope (for this proposal)

- Actually provisioning tenants or importing data
- File upload (we read from a folder in the repo, like `sample-data/`)
- Pushing branches or opening PRs from the app
- Auth

## User flow

```
Dashboard ──"New customer"──▶ Customer Info form ──Save──▶ customer appears in queue
                                                            (step 1 "Customer Info" = completed)
                                    │
                                    ▼
                         Data Mapping tab: "Build plan"
                         server reads source folder ──▶ draft plan
                                    │
                         CS reviews: fixes unmapped values,
                         answers open decisions
                                    │
                                    ▼
                         "Save & commit plan"
                         writes onboarding-plans/<id>.json
                         git commit on branch onboarding/<id>
                         (step 2 "Data Mapping" = completed)
```

## 1. Customer setup

### Form fields (Customer Info tab)

| Field | Example | Why it's needed |
|---|---|---|
| Name | ABC Accounting | Display, plan file name |
| Industry | Accounting | Existing model field |
| Region | North America / UK | Existing model field; drives default currency |
| Contact email | ops@abc.example | Existing model field |
| Plan tier | starter / professional / enterprise | Existing `Tenant.plan` |
| Currency | USD / GBP | Amounts carry no currency (C's only hint is the `amount_gbp` column name) |
| Date format | `MM/DD/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY` | **Required.** It can't be guessed: `03/05/2024` and `05-09-2023` parse both ways |
| Source folder | `sample-data/CustomerA_ABCAccounting` | Where the four CSVs live |

The source folder is a dropdown built from the folders in `sample-data/`, so users can't type arbitrary paths.

### Model changes

`Customer` gains `currency`, `dateFormat` and `sourceFolder`. Saving a customer also creates a `pending` tenant and a default onboarding state, using the existing `createTenant` and `createDefaultOnboardingSteps`.

## 2. Building the plan

### Draft generation (server)

For each of the four files, in this order: chart of accounts, clients, contacts, transactions.

1. **Parse** with a quote-aware CSV parser and check every row has as many fields as the header. This catches today's two broken files:
   - Customer A `chart_of_accounts.csv` line 33 (`Electric, gas, water`)
   - every row of Customer B `clients.csv` (`Williams, Robert`)
2. **Map columns** by matching each header against a synonym list per target field. Examples:
   - `name`: `Client Name`, `companyName`, `business_name`
   - `status`: `Status`, `clientStatus`, `account_status`

   Matching ignores case and strips spaces and `_`. A header with no match is left `unmapped`.
3. **Map values** for picklist fields (status, entity type, payment terms, account type, debit/credit flag, transaction status, payment method, true/false flags) using a value dictionary seeded from the sample-data README. A value not in the dictionary is listed as `unmapped` with its row count.
4. **Check the data**:
   - every contact and transaction points to a client that exists
   - every transaction uses an account that exists
   - every parent account exists
   - no duplicate IDs
   - dates parse with the declared format
   - the debit/credit flag disagrees with the account's normal balance (a warning)
5. **List open decisions** for CS, with counts. For Customer A:
   - Import transactions for inactive or pending clients? (5)
   - Import voided transactions? (1)
   - Can parent accounts take postings?
   - Which sign rule do the transactions use?

The target fields are a fixed list in `server/src/onboarding/targetSchema.js`:

| Entity | Target fields |
|---|---|
| client | id, name, entityType, status, startDate, taxId, annualRevenue, industry, paymentTerms, primaryContactName |
| contact | id, clientId, firstName, lastName, email, phone, role, status, preferredChannel, department |
| account | code, name, type, subType, normalBalance, active, description, parentCode |
| transaction | id, date, clientId, accountCode, description, side, amount, reference, paymentMethod, status, category |

### Review (Data Mapping tab)

The tab shows the draft as editable tables:

- **Columns:** source header, then a dropdown of target fields
- **Values:** source value, then a dropdown of target values
- **Problems:** read-only list of what the checks found
- **Decisions:** a choice for each open decision

"Save & commit" stays disabled until every required target field is mapped, every value is mapped, and every decision is answered.

## 3. The plan file

`onboarding-plans/<customer-id>.json`, one per customer:

```json
{
  "version": 1,
  "customer": {
    "id": "abc-accounting",
    "name": "ABC Accounting",
    "region": "North America",
    "currency": "USD",
    "dateFormat": "MM/DD/YYYY",
    "sourceFolder": "sample-data/CustomerA_ABCAccounting",
    "plan": "professional"
  },
  "entities": {
    "client": {
      "file": "clients.csv",
      "rowCount": 10,
      "columns": { "Client ID": "id", "Client Name": "name", "Business Type": "entityType" },
      "values": {
        "status": { "Active": "active", "Inactive": "inactive", "Pending": "pending" }
      }
    }
  },
  "importOrder": ["account", "client", "contact", "transaction"],
  "issues": [
    { "severity": "error", "entity": "account", "line": 33, "message": "10 fields, expected 8 (unquoted comma)" }
  ],
  "decisions": {
    "importInactiveClientTransactions": true,
    "importVoidedTransactions": false,
    "allowPostingToParentAccounts": false
  },
  "createdBy": "cs-user",
  "createdAt": "2026-10-27T15:00:00Z"
}
```

Plans are JSON so they diff cleanly in review and can be read directly by the Import step later.

## 4. Committing to the repo

`POST /api/customers/:id/plan/commit` on the server:

1. Validates the plan, re-running the same checks as the UI.
2. Writes `onboarding-plans/<id>.json`. The `id` is reduced to lowercase letters, digits and dashes, and the resolved path must stay inside `onboarding-plans/`.
3. Runs `git` with `execFile` (no shell, fixed arguments):
   - `git switch -c onboarding/<id>`, or `git switch onboarding/<id>` if the branch exists
   - `git add onboarding-plans/<id>.json`, staging that file only
   - `git commit -m "Onboarding plan: <name>"`
4. Returns the branch name and commit SHA, and marks step 2 completed.

**Guardrails**

- **Off by default:** committing only works when `PLAN_COMMIT_ENABLED=true`. Otherwise the plan is written but not committed, so the feature is safe in shared environments.
- **Clean tree required:** the server refuses to commit if any file other than the plan file has uncommitted changes, so it never sweeps up a developer's work.
- **No push:** pushing and opening PRs stay manual. A follow-up could add these with `gh`.

## API changes

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/sources` | List folders in `sample-data/` |
| POST | `/api/customers` | Create a customer, plus a pending tenant and an onboarding state |
| POST | `/api/customers/:id/plan/draft` | Read the source folder and return a draft plan |
| PUT | `/api/customers/:id/plan` | Save the edited plan in memory |
| POST | `/api/customers/:id/plan/commit` | Write the plan file and commit it |

## New server modules

| File | Responsibility |
|---|---|
| `server/src/onboarding/csv.js` | Quote-aware CSV parser that reports field-count mismatches |
| `server/src/onboarding/targetSchema.js` | Target fields, header synonyms, value dictionaries |
| `server/src/onboarding/planBuilder.js` | Builds the draft plan: column and value mapping, checks, decisions |
| `server/src/onboarding/planRepo.js` | Writes the plan file and runs the git commands |

No new dependencies are needed: the CSV parser is small enough to hand-write, and git runs through `child_process`.

## Delivery in thin slices

Each slice ships working and leaves the dashboard more useful than before.

| Slice | What CS gets | Done when |
|---|---|---|
| 1 | "New customer" form; the customer appears in the queue with step 1 completed | e2e test creates a customer and sees the card |
| 2 | "Build plan" shows the column mapping plus parse problems for each file | Customer B's `clients.csv` is flagged; unit tests on the parser and mapper |
| 3 | Value mappings, data checks and open decisions in the draft | Customer A shows 5 transactions for inactive or pending clients |
| 4 | Edit the draft and save it to `onboarding-plans/<id>.json` | The file round-trips; step 2 completes |
| 5 | Commit the plan to an `onboarding/<id>` branch | Integration test against a temporary git repo |

Slices 1 and 2 already save CS time: they catch broken files and give a first mapping before anyone opens a spreadsheet.

## Testing

- **Unit** (`node --test`): CSV parser (quoted fields, field counts), header matching, value mapping, date parsing per format, and plan building against all three sample customers.
- **Integration:** `planRepo` run against a temporary repo created with `git init`. Never run it against the working repo.
- **E2E** (Playwright): create a customer, build a plan for Customer A, save it.

## Risks and open questions

1. **Committing from the server only fits a dev or workshop setup.** In production, plans would more likely go into a database or through a PR service. Is git the right long-term home, or only for now?
2. **Who reviews plans?** If a PR is the review gate, the follow-up "push and open PR" step becomes important.
3. **Customer C's `Limited Company`** covers both Corporation and S-Corp in the sample-data README, so a value dictionary can't always map back cleanly. The review screen has to allow per-customer overrides.
4. **Synonym lists will grow** with every new customer. Committed plans are a good source for extending them.
5. **This environment's git refuses to run in this repo** ("dubious ownership"), because the folder is owned by Administrators. Commits from the server would fail here until the folder's owner changes or a `safe.directory` exception is added.
