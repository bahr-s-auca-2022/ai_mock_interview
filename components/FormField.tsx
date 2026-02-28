import { Controller, Control, FieldValues, Path } from "react-hook-form";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password";
}

const FormField = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
}: FormFieldProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-sm font-semibold text-light-400 ml-1">
            {label}
          </FormLabel>
          <FormControl>
            <Input
              className="bg-dark-300/50 border-light-400/10 h-12 px-4 text-white placeholder:text-light-400/40 focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-all duration-300 rounded-xl"
              placeholder={placeholder}
              type={type}
              {...field}
            />
          </FormControl>
          <FormMessage className="text-destructive-100 text-xs font-medium" />
        </FormItem>
      )}
    />
  );
};

export default FormField;
