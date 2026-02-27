import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bus, Car, Info } from "lucide-react";

interface TransportVatModalProps {
  open: boolean;
  onClose: () => void;
}

export function TransportVatModal({ open, onClose }: TransportVatModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Info className="w-5 h-5 text-primary" />
            UK Transport VAT — Mixed Rate
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Transport in the UK has a mixed VAT rate depending on the type of service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Public Transport */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Bus className="w-4 h-4 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Public Transport (Bus / Train)
              </p>
              <p className="text-sm text-green-700 dark:text-green-400 font-bold mt-0.5">
                0% VAT — Zero Rated
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                Scheduled bus and train services are zero-rated for UK VAT.
              </p>
            </div>
          </div>

          {/* Taxis / Car Hire */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Car className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Taxis &amp; Car Hire
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                20% VAT — Standard Rate
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                Taxis, private hire vehicles, and car hire are subject to the standard 20% VAT rate.
              </p>
            </div>
          </div>

          {/* Default note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/60 border border-border">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Default rate: 20%</strong> — Unless the transaction is explicitly confirmed as a public transport service (bus or train), the standard 20% VAT rate will be applied.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Understood — Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
