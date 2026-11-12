import { pool } from "../src/db/client";

type DistributorSource = {
  vendorName: string;
  distributorName: string;
  sourceUrl: string;
};

const sources: DistributorSource[] = [
  // HPE Aruba Instant On
  {
    vendorName: "HPE Aruba Instant On",
    distributorName: "MEC Networks",
    sourceUrl: "https://mec.ph/products/switching-and-routing/aruba/",
  },
  {
    vendorName: "HPE Aruba Instant On",
    distributorName: "InfoBahn",
    sourceUrl: "https://shop.ibahn.net.ph/collections/aruba-by-hpe-network-switches/network-switches",
  },
  {
    vendorName: "HPE Aruba Instant On",
    distributorName: "CT Link Systems, Inc.",
    sourceUrl: "https://www.ctlink.com.ph/products/hewlett-packard-enterprise-philippines/",
  },

  // TP-Link Omada
  {
    vendorName: "TP-Link Omada",
    distributorName: "NorthCircuit",
    sourceUrl: "https://northcircuit.ph/",
  },
  {
    vendorName: "TP-Link Omada",
    distributorName: "PC Express",
    sourceUrl: "https://pcx.com.ph/collections/vendors?q=tp-link",
  },
  {
    vendorName: "TP-Link Omada",
    distributorName: "TP-Link Official Store (Shopee)",
    sourceUrl: "https://shopee.ph/tplink.philippines",
  },

  // Ubiquiti UniFi
  {
    vendorName: "Ubiquiti UniFi",
    distributorName: "NorthCircuit",
    sourceUrl: "https://northcircuit.ph/",
  },
  {
    vendorName: "Ubiquiti UniFi",
    distributorName: "MEC Networks",
    sourceUrl: "https://mec.ph/products/wireless/ubiquiti/",
  },
  {
    vendorName: "Ubiquiti UniFi",
    distributorName: "Ubiquiti Official Store (LazMall)",
    sourceUrl: "https://www.lazada.com.ph/shop/ubiquiti/?path=index.htm",
  },

  // Ruijie
  {
    vendorName: "Ruijie",
    distributorName: "I-Connect Systems Integration, Inc.",
    sourceUrl: "https://www.iconnectph.com/_ruijie.html",
  },
  {
    vendorName: "Ruijie",
    distributorName: "Ronisys",
    sourceUrl: "https://www.ronisys.ph/portfolio-cat/reyee-networks/",
  },
  {
    vendorName: "Ruijie",
    distributorName: "Technosure PH",
    sourceUrl: "https://technosureph.com/",
  },

  // Grandstream GWN Cloud
  {
    vendorName: "Grandstream GWN Cloud",
    distributorName: "International Micro Village, Inc. (IMV)",
    sourceUrl: "https://www.imvphil.com/grandstream",
  },
  {
    vendorName: "Grandstream GWN Cloud",
    distributorName: "iConnect Technologies",
    sourceUrl: "https://www.iconnecttechnologies.com/authorized-dealer-of-grandstream-products/",
  },
  {
    vendorName: "Grandstream GWN Cloud",
    distributorName: "Ardent Networks Inc.",
    sourceUrl: "https://ardentnetworks.com.ph/empowering-smarter-communication-grandstream-now-available-in-the-philippines-through-ardent-networks/",
  },

  // Cisco Business
  {
    vendorName: "Cisco Business",
    distributorName: "InfoBahn",
    sourceUrl: "https://shop.ibahn.net.ph/collections/cisco-switches",
  },
  {
    vendorName: "Cisco Business",
    distributorName: "International Micro Village, Inc. (IMV)",
    sourceUrl: "https://www.imvphil.com/",
  },
  {
    vendorName: "Cisco Business",
    distributorName: "Kital Philippines",
    sourceUrl: "https://www.kital.com.ph/cisco/switches-routers-wifi/",
  },
];

async function seed() {
  try {
    await pool.query("BEGIN");

    const vendorIds = new Map<string, number>();
    const distributorIds = new Map<string, number>();

    for (const source of sources) {
      let vendorResult = await pool.query(
        `SELECT vendor_id
         FROM vendor
         WHERE name = $1`,
        [source.vendorName]
      );

      if (vendorResult.rowCount === 0) {
        vendorResult = await pool.query(
          `INSERT INTO vendor (name, need_controller)
           VALUES ($1, FALSE)
           RETURNING vendor_id`,
          [source.vendorName]
        );
      }

      vendorIds.set(
        source.vendorName,
        vendorResult.rows[0].vendor_id
      );

      let distributorResult = await pool.query(
        `SELECT distributor_id
         FROM distributor
         WHERE name = $1`,
        [source.distributorName]
      );

      if (distributorResult.rowCount === 0) {
        distributorResult = await pool.query(
          `INSERT INTO distributor (name)
           VALUES ($1)
           RETURNING distributor_id`,
          [source.distributorName]
        );
      }

      distributorIds.set(
        source.distributorName,
        distributorResult.rows[0].distributor_id
      );
    }

    for (const source of sources) {
      const vendorId = vendorIds.get(source.vendorName);
      const distributorId = distributorIds.get(source.distributorName);

      if (!vendorId || !distributorId) {
        throw new Error(
          `Missing vendor/distributor ID for ${source.vendorName} / ${source.distributorName}`
        );
      }

      await pool.query(
        `INSERT INTO pricing_source
          (vendor_id, distributor_id, source_url, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT DO NOTHING`,
        [vendorId, distributorId, source.sourceUrl]
      );
    }

    await pool.query("COMMIT");

    const result = await pool.query(
      `SELECT
         ps.source_id,
         v.name AS vendor,
         d.name AS distributor,
         ps.source_url,
         ps.is_active
       FROM pricing_source ps
       JOIN vendor v
         ON v.vendor_id = ps.vendor_id
       JOIN distributor d
         ON d.distributor_id = ps.distributor_id
       ORDER BY v.name, d.name`
    );

    console.log("Distributor sources seeded successfully.");
    console.table(result.rows);
  } catch (error) {
    try {
      await pool.query("ROLLBACK");
    } catch {
      // Ignore rollback errors.
    }

    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
