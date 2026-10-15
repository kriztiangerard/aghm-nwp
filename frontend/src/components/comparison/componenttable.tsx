import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Cpu } from "lucide-react";
import { formatCurrency, type BomLineItem } from "../comparison/Comparison";

interface ComponentTableProps {
  bom: BomLineItem[];
  currency: string;
}

export const ComponentTable: React.FC<ComponentTableProps> = ({
  bom,
  currency,
}) => {
  const totalUnits = bom.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-muted-foreground" />
          Network Components
        </h4>
        <span className="text-xs text-muted-foreground">
          {totalUnits} total units
        </span>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs">Component</TableHead>
              <TableHead className="text-xs text-center w-16">Qty</TableHead>
              <TableHead className="text-xs text-right">Unit Price</TableHead>
              <TableHead className="text-xs text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bom.map((item) => (
              <TableRow key={item.sku}>
                <TableCell className="py-2.5">
                  <div className="font-medium text-xs text-foreground">
                    {item.sku}
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1">
                    {item.category} • {item.modelName}
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium text-xs py-2.5">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground py-2.5">
                  {formatCurrency(item.unitPrice, currency)}
                </TableCell>
                <TableCell className="text-right font-semibold text-xs py-2.5">
                  {formatCurrency(item.subtotal, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ComponentTable;