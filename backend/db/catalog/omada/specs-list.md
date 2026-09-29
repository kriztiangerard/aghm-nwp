# Omada Specifications List

All datasheets can be found at: https://support.omadanetworks.com/ph/document/?documentResourceTypeIdList=1130

Stick with international versions; PH uses EU/UN regional specifications by default. Do not use US marked datasheets. Only included in the dataset are the latest and currently sold models for indoors.

If no datasheet is available, website entry is listed instead. Unless listed otherwise, model is the latest version with no EOS/EOL.

## Possible distributors list
* DynaQuest - https://dynaquestpc.com/collections/access-point-range-extender?sort_by=best-selling&filter.p.vendor=TPLink

Lazada/Shopee-based
* Official TP-Link - https://shopee.ph/mall/search?keyword=eap&shop=117867014
* EJD - https://www.lazada.com.ph/shop-access-points/?from=wangpu&m=shop&q=All-Products&style=wf&tp-link-by-ejd
* Drex Technologies - https://www.lazada.com.ph/shop-access-points/?drex-technologies&from=wangpu&m=shop&q=All-Products

## EOL Policy

See policy here: https://privacy.tp-link.com/web/website/policy/. The August 2026 EOL list is at https://static.tp-link.com/upload/manual/2026/202608/20260827/EOL%20List_Business-V8.pdf. 

* End of Sale (EOS) - listed on website
* End of Life (EOL) - Omada uses End of Maintenance; 3 years after EOS

----

## Access Points

### Naming scheme

| Part | Designation | Meaning |
| --- | --- | --- |
| Generation number | 7 | Wi-Fi 7 (802.11be) |
| Generation number | 6 | Wi-Fi 6 / 6E (802.11ax) |
| Generation number | 2 | Wi-Fi 5 (802.11ac) |
| Generation number | 1 | Wi-Fi 4 (802.11n) |
| Suffix | HD | High Density |
| Suffix | Wall / Wall Plate | Designed to mount over standard in-wall Ethernet faceplates, often with built-in switch ports |
| Suffix | LR | Long Range |
| Suffix | UR | Ultra Range |
| Suffix | Outdoor | Weather-resistant casing for exterior deployments; out of scope |
| Suffix | Bridge Kit | Out of scope |

### EAP7XX (WiFi 7)

* EAP720 - https://support.omadanetworks.com/ph/document/35231/
* EAP770 - https://support.omadanetworks.com/ph/document/3722/
* EAP772 (v2.2) - https://support.omadanetworks.com/ph/document/106652/
* EAP773 - https://support.omadanetworks.com/ph/document/3721/


<!--* EAP770 (US v2) - https://support.omadanetworks.com/ph/document/3722/
* EAP723 - https://support.omadanetworks.com/ph/document/6134/
* EAP725 Wall (v1.2) - https://support.omadanetworks.com/ph/document/107602/ 
* EAP727 - https://support.omadanetworks.com/ph/document/113992/
* EAP775 - https://support.omadanetworks.com/ph/document/108443/
* EAP783 - https://support.omadanetworks.com/ph/document/3862/
* EAP787 - https://www.omadanetworks.com/ph/business-networking/omada-wifi-ceiling-mount/eap787/#specifications -->


### EAP6XX (WiFi 6)

* EAP620 HD (v3.20) - https://support.omadanetworks.com/ph/document/3709/
* EAP650 (v4) - https://support.omadanetworks.com/ph/document/126975/
* EAP670 - https://support.omadanetworks.com/ph/document/3744/
* EAP650-Wall - https://support.omadanetworks.com/ph/document/25530/

<!-- * EAP610
* EAP653
* EAP660 HD - https://support.omadanetworks.com/ph/document/112475/ -->

### EAP2XX (WiFi 5)

* EAP225 - https://support.omadanetworks.com/ph/document/3613/ OR https://www.omadanetworks.com/ph/business-networking/omada-wifi-ceiling-mount/eap225/#specifications
* EAP235 - 
* EAP235-Wall - https://support.omadanetworks.com/ph/document/2302/
* EAP245 - https://support.omadanetworks.com/ph/document/3613/


### EAP1XX (WiFi 4)

* EAP110 - https://support.omadanetworks.com/ph/document/3613/
* EAP115 - https://support.omadanetworks.com/ph/document/3613/


## Routers

Excluded are outdoor variants.

### Fusion

* Fusion 2.5G -  https://support.omadanetworks.com/ph/document/123311/
* Fusion G+ - https://support.omadanetworks.com/ph/document/126031/
* Fusion 2.5G PoE - https://support.omadanetworks.com/ph/document/126644/

### Wired

* ER706WP-4G v1.2 - https://support.omadanetworks.com/ph/document/53112/
* ER7412-M2 v1.36 - https://support.omadanetworks.com/ph/document/117706/
* ER605W v2 - https://support.omadanetworks.com/ph/document/32903/ 
* ER707-M2 v1.36 [NOTE: v1.6 is EOS 11/16/2025, EOL 11/16/2028] - https://support.omadanetworks.com/ph/document/119999/
* ER8411 v1.6 - https://support.omadanetworks.com/ph/document/121692/ [NOTE: EOS 10/15/2026, EOL 10/15/2029]
* ER7406 v1.6 - https://www.omadanetworks.com/ph/business-networking/omada-router-wired-router/er7406/#specifications  [NOTE: EOS 6/29/2026, EOL 6/29/2029]
* ER605 v2.6 - https://support.omadanetworks.com/ph/document/2122/ [NOTE: EOS 10/15/2026, EOL 10/15/2029]
* ER7206 V2.3 - https://support.omadanetworks.com/ph/document/126039/

### Integrated

Note: Integrated Controller, Router (Gateway), and PoE switch; must have specs on each table.
* ER7212PC v2.26 - https://support.omadanetworks.com/ph/document/116729/

## Switches

Out of scope for the initial list are unmanaged switches. Older models have TL-SG while newer only has SG. Make sure that model is SG as much as possible.

### Naming scheme

| Switch Level | Naming Format | Example   |
| ------------ | ------------- | --------- |
| L3           | Sx6xxx        | SG6428XHP |
| L2+          | Sx3xxx        | SG3428MP  |
| Smart        | Sx2xxx        | SG2428P   |
| Easy Managed | ES2xxx        | ES205G    |

Suffixes
* SG - Speed gigabit
* SX - Speed 10-gigabit
* Last two digits - port count
* P - PoE enabled
* MP - Max power; high-budget PoE
* PP - PoE++ enabled
* X - with 10-gig SFP+
* F - fiber
* M2 - base RJ45 ports run at 2.5 Gbps instead of standard 1 Gbps

### Access Max

* SX3832 v1.26 - https://support.omadanetworks.com/ph/document/113334/ [NOTE: v1 is EOS 10/15/2026, EOL 10/15/2029]
* SX3832MPP v1.26 - https://support.omadanetworks.com/ph/document/116407/ [NOTE: v1 is EOS 1/6/2027, EOL 1/6/2030]
* SX3206HPP v1 - https://www.omadanetworks.com/ph/business-networking/omada-switch-access-max/tl-sx3206hpp/#specifications [NOTE: EOS 2/5/2025, EOL 2/5/2028]

### Access Pro

* SG3210X-M2 - https://support.omadanetworks.com/ph/document/118259/
* SG3428XPP-M2 - https://support.omadanetworks.com/ph/document/115757/
* SG3210XHP-M2 v2.6 - https://support.omadanetworks.com/ph/document/2174/ [NOTE: EOS 5/21/2026, EOL 5/21/2029]

### Access
* SG2210P v5.3 – https://support.omadanetworks.com/ph/document/128552/
* SG2428P v5.33 - https://www.omadanetworks.com/ph/business-networking/omada-switch-access/sg2428p/#specifications [NOTE: EOS 10/15/2026, EOL 10/15/2029]
* SG3452P v3.4 - https://support.omadanetworks.com/ph/document/113341/
* SG3210 v3.6- https://support.omadanetworks.com/ph/document/2167/ [NOTE: EOS 7/14/2025, EOL 7/14/2028]
* SG3428 v2.3 - https://support.omadanetworks.com/ph/document/4019/ [NOTE: EOS 10/15/2026, EOL 10/15/2029]
* SG3452 - https://support.omadanetworks.com/ph/document/4022/

### Controllers

* OC200 v2.6 - https://support.omadanetworks.com/ph/document/2040/ 
* OC220 v2.6 - https://www.omadanetworks.com/ph/business-networking/omada-controller-hardware/oc220/#specifications 
* OC300 v1.6 - https://support.omadanetworks.com/ph/document/2400/ [NOTE: EOS 10/15/2026, EOL 10/15/2029]
* OC400 - https://support.omadanetworks.com/ph/document/4419/

## Reference points for Omada deployments
* EAP FAQs - https://support.omadanetworks.com/ph/document/12902/
* How to Choose EAP products - https://support.omadanetworks.com/us/document/12932/
