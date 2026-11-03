import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, Cpu, Info } from "lucide-react";
import { formatDate, formatPrice } from "./format";
import type { BomLineItem } from "./types";

interface ComponentTableProps {
  bom: BomLineItem[];
  currency: string;
}

const SOURCE_LABEL = { synchronized: "Synced", manual: "Manual" } as const;
const WARN = "text-amber-700 dark:text-amber-400";

export const ComponentTable: React.FC<ComponentTableProps> = ({ bom, currency }) => {
  const totalUnits = bom.reduce((acc, item) => acc + item.quantity, 0);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [openStaleTooltip, setOpenStaleTooltip] = useState<string | null>(null);
  const legendButtonRef = useRef<HTMLButtonElement>(null);
  const [legendPosition, setLegendPosition] = useState({ left: 0, top: 0 });

  const positionLegend = () => {
    const button = legendButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 256;
    setLegendPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)),
      top: rect.bottom + 6,
    });
  };

  const showLegendPopover = () => {
    positionLegend();
    setShowLegend(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            ref={legendButtonRef}
            type="button"
            className="flex items-center gap-1.5 text-sm font-semibold md:pointer-events-none"
            aria-expanded={mobileExpanded}
            aria-controls="bom-table"
            onClick={() => setMobileExpanded((expanded) => !expanded)}
          >
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span>Bill of Materials</span>
            <ChevronDown
              className={`w-4 h-4 md:hidden transition-transform ${mobileExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          <div className="relative">
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Show badge legend"
              aria-expanded={showLegend}
              onClick={() => {
                if (window.matchMedia("(hover: none)").matches) {
                  setShowLegend((visible) => {
                    if (!visible) positionLegend();
                    return !visible;
                  });
                } else {
                  showLegendPopover();
                }
              }}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") showLegendPopover();
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") setShowLegend(false);
              }}
            >
              <Info className="size-4" aria-hidden="true" />
            </button>
            {showLegend && createPortal(
              <div
                role="tooltip"
                className="fixed z-50 w-72 rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
                style={{ left: legendPosition.left, top: legendPosition.top }}
              >
                <p className="mb-2 text-xs font-semibold">Legend</p>
                <dl className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Synced</Badge>
                    <dd className="text-muted-foreground">Price supplied by a vendor feed</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Manual</Badge>
                    <dd className="text-muted-foreground">Price entered manually</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Generic</Badge>
                    <dd className="text-muted-foreground">Generic component substitute</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${WARN}`}>Stale</Badge>
                    <dd className="text-muted-foreground">Price may be out of date</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${WARN}`}>
                      <AlertTriangle aria-hidden="true" />
                      <dd>Sunsetting</dd>
                    </Badge>
                    <dd className="text-muted-foreground">Device approaching end-of-life.</dd>
                  </div>
                </dl>
              </div>,
              document.body
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{totalUnits} total units</span>
      </div>

      {/* Wide table scrolls inside its own container, never the page body */}
      <div
        id="bom-table"
        className={`rounded-md border overflow-x-auto ${mobileExpanded ? "block" : "hidden"} md:block`}
      >
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
                          ? "Generic"
                          : "Generic"}
                      </Badge>
                    )}
                    {item.status === "SUNSETTING" && (
                      <Badge variant="outline" className={`text-[10px] ${WARN}`}>
                      <AlertTriangle aria-hidden="true" />
                      <dd>Sunsetting</dd>
                    </Badge>
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
                        item.priceUpdatedAt ? (
                          <span
                            className="relative inline-flex"
                            onMouseEnter={() => setOpenStaleTooltip(item.sku)}
                            onMouseLeave={() => setOpenStaleTooltip(null)}
                          >
                            <Badge
                              variant="outline"
                              className={`cursor-help text-[10px] ${WARN}`}
                              role="button"
                              tabIndex={0}
                              onFocus={() => setOpenStaleTooltip(item.sku)}
                              onBlur={() => setOpenStaleTooltip(null)}
                              onClick={() => setOpenStaleTooltip((current) =>
                                current === item.sku ? null : item.sku
                              )}
                            >
                              Stale
                            </Badge>
                            {openStaleTooltip === item.sku && (
                              <span className="absolute bottom-full right-0 z-20 mb-1.5 w-max max-w-48 rounded bg-foreground px-2 py-1 text-[10px] text-background shadow-md">
                                Last verified {formatDate(item.priceUpdatedAt)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <Badge variant="outline" className={`text-[10px] ${WARN}`}>
                            Stale
                          </Badge>
                        )
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