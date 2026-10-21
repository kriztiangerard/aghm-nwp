# Indicators for the BOM (Draft)

* "Prices in this estimate are aggregated from local Philippine distributors and e-commerce platforms. Actual hardware versions and regional variants (e.g., US vs. EU/UN) may vary by vendor. Please confirm exact SKUs and local warranty validity prior to final procurement."

* "Price Staleness Warning: The estimated price for [Device Name] is based on market data older than 30 days and is subject to local market fluctuation." (Triggered by last_updated > 30 days)

* For POE; If Deficient: "⚠ PoE Overload: The total maximum power draw of the planned endpoint devices ([X] Watts) exceeds the available Power over Ethernet (PoE) budget of the selected switches ([Y] Watts). Additional PoE switches or injectors are required."  If Sufficient: "PoE Budget Adequate: The selected switches provide sufficient PoE capacity ([Y] Watts) to support the total maximum draw of the planned endpoint devices ([X] Watts)." (Calculated from switch poe_budget_w vs AP max_power_draw_w)

* "Space Requirement: This deployment requires a minimum of [X]U of continuous rack space. Ensure the physical cabinet has sufficient depth and ventilation to accommodate the selected hardware." (Calculated from u_height and is_rack_mountable)

* "Configuration Notice: [Device Name] requires a dedicated hardware or software controller within the local network or cloud for full provisioning, routing, and management." (Triggered by need_controller = TRUE without a controller in the BOM)

* "Lifecycle Warning: [Device Name] is approaching its scheduled End-of-Support (EOS) date on [Date]. Selecting a newer generation model is highly recommended to ensure continuous security updates and firmware support."  (Triggered if the current date is within 1 year of eol_date or eos_date)