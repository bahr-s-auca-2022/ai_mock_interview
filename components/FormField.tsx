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
        <FormItem className="space-y-3">
          <FormLabel className="label text-base font-medium">{label}</FormLabel>
          <FormControl>
            <Input
              className="input text-light-100 placeholder:text-light-400 focus:placeholder:text-light-400/60 transition-all duration-200"
              placeholder={placeholder}
              type={type}
              {...field}
            />
          </FormControl>
          <FormMessage className="text-destructive-100 font-medium" />
        </FormItem>
      )}
    />
  );
};

export default FormField;
