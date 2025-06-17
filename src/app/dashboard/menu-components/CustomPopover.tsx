import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export interface PopoverItem {
  value: string;
  label: string;
  [key: string]: any;
}

interface CustomPopoverProps<T extends PopoverItem> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: T | undefined;
  onValueChange: (item: T | undefined) => void;
  items: T[];
  placeholder: string;
  buttonTextDefault: string;
}

export function CustomPopover<T extends PopoverItem>({
  open,
  onOpenChange,
  value,
  onValueChange,
  items,
  placeholder,
  buttonTextDefault,
}: CustomPopoverProps<T>) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm sm:text-base text-foreground hover:animate-pulse focus:ring-sky-500 border-slate-300"
        >
          {value ? value.label : buttonTextDefault}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && (
              <CommandEmpty>No output found.</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={(currentValue) => {
                    const selectedItem = items.find(
                      (i) =>
                        i.label.toLowerCase() === currentValue.toLowerCase()
                    );
                    onValueChange(selectedItem);
                    onOpenChange(false);
                    setSearch("");
                  }}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
