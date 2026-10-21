import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Cpu } from "lucide-react";
import { formatDate, formatPrice } from "./format";
import type { BomLineItem } from "./types";

interface ComponentTableProps {
  bom: BomLineItem[];
  currency: string;
}

const SOURCE_LABEL = { synchronized: "Synchronized", manual: "Manual" } as const;
const WARN = "text-amber-700 dark:text-amber-400";

export const ComponentTable: React.FC<ComponentTableProps> = ({ bom, currency }) => {
  const totalUnits = bom.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-muted-foreground" />
          Bill of Materials
        </h4>
        <span className="text-xs text-muted-foreground">{totalUnits} total units</span>
      </div>

      {/* Wide table scrolls inside its own container, never the page body */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs min-w-[220px]">Model</TableHead>
              <TableHead className="text-xs text-center w-14">Qty</TableHead>
              <TableHead className="text-xs text-right min-w-[130px]">Unit price</TableHead>
              <TableHead className="text-xs text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bom.map((item) => {
              const unavailable = item.unitPrice === null;
              return (
                <TableRow key={`${item.category}-${item.sku}`}>
                  <TableCell className="py-2.5 align-top text-xs text-muted-foreground">
                    {item.category}
                  </TableCell>

                  <TableCell className="py-2.5 align-top whitespace-normal">
                    <div className="font-medium text-xs text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">{item.sku}</div>
                    {item.isGeneric && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {item.category === "Enclosure"
                          ? "Generic enclosure, not a vendor part"
                          : "Generic item, not a vendor part"}
                      </Badge>
                    )}
                    {item.status === "SUNSETTING" && (
                      <p className={`mt-1 flex items-start gap-1 text-[11px] ${WARN}`}>
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                        Sunsetting: confirm availability before purchase
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="py-2.5 align-top text-center font-medium text-xs">
                    {item.quantity}
                  </TableCell>

                  <TableCell className="py-2.5 align-top text-right whitespace-normal">
                    <div className={`text-xs ${unavailable ? `font-medium ${WARN}` : "text-muted-foreground"}`}>
                      {formatPrice(item.unitPrice, currency)}
                    </div>
                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {SOURCE_LABEL[item.priceSource]}
                      </Badge>
                      {item.isStale && (
                        <Badge variant="outline" className={`text-[10px] ${WARN}`}>
                          {item.priceUpdatedAt
                            ? `Stale · last verified ${formatDate(item.priceUpdatedAt)}`
                            : "Stale · never verified"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className={`py-2.5 align-top text-right font-semibold text-xs ${unavailable ? WARN : ""}`}>
                    {formatPrice(item.subtotal, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ComponentTable;