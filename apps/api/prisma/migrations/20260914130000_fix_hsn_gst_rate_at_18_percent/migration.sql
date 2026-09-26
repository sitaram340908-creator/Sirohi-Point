-- Sirohi Point uses a fixed GST rate for every HSN in the current billing plan.
UPDATE "HsnMaster"
SET "cgstRate" = 9,
    "sgstRate" = 9,
    "igstRate" = 18,
    "updatedAt" = CURRENT_TIMESTAMP;
