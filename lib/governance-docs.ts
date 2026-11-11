// Static governance documentation. Edit owners / sources to match your real dataset.
export const DATASET_INFO = [
  { label: "Dataset", value: "Sales / POS transaction export" },
  { label: "Source system", value: "Uploaded by the user (Sales, SAP or POS export)" },
  { label: "Data owner", value: "Sales Operations (edit me)" },
  { label: "Refresh", value: "On upload" },
];

export const DATA_DICTIONARY: { column: string; type: string; description: string; required: boolean }[] = [
  { column: "TransactionID", type: "Text", description: "Unique order / invoice ID. Used for duplicate checks and reconciliation.", required: false },
  { column: "Date", type: "Date", description: "Transaction date.", required: true },
  { column: "Product", type: "Text", description: "Product name or SKU sold.", required: true },
  { column: "Category", type: "Text", description: "Product category.", required: false },
  { column: "Region", type: "Text", description: "Sales region.", required: false },
  { column: "Channel", type: "Text", description: "Sales channel (Retail, Q-Comm, E-commerce, ...).", required: false },
  { column: "CustomerID", type: "Text", description: "Customer identifier.", required: true },
  { column: "UnitsSold", type: "Number", description: "Units in the transaction. Must be positive.", required: true },
  { column: "BasePrice", type: "Number", description: "List price per unit. Must be positive.", required: true },
  { column: "Discount", type: "Number", description: "Discount as a fraction, 0 to 1.", required: false },
  { column: "Revenue", type: "Number", description: "Sales amount. Should equal units x price x (1 - discount).", required: true },
  { column: "InventoryLevel", type: "Number", description: "Stock on hand at the time of sale.", required: false },
  { column: "Vendor", type: "Text", description: "Supplier of the product.", required: false },
  { column: "Warehouse", type: "Text", description: "Fulfilling warehouse.", required: false },
  { column: "ShippingDays", type: "Number", description: "Days from order to delivery.", required: false },
  { column: "ExpiryDate", type: "Date", description: "Product expiry date. Must be after the transaction date.", required: false },
  { column: "NPS", type: "Number", description: "Customer score, 0 to 10.", required: false },
];

export const LINEAGE = [
  { step: "Raw file", detail: "Sales / POS export (.xlsx, .xls, .csv)" },
  { step: "Header mapping", detail: "Columns matched to canonical fields, no defaults applied" },
  { step: "Validation", detail: "13 rules run, exceptions logged" },
  { step: "Cleaned records", detail: "Missing values backfilled, Master DB built" },
  { step: "Analytical metrics", detail: "CLV, ROAS, CAC, churn and risk flags derived" },
  { step: "Dashboards and reports", detail: "9 views and PPTX export" },
];
