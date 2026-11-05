import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./ui";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  full?: boolean;
  msgRequired?: string;
  msgPattern?: string;
  children: ReactNode;
};

/** Label, control, hint and error slot, in the markup forms.js validates. */
export function Field({ id, label, required, optional, hint, full, msgRequired, msgPattern, children }: FieldProps) {
  return (
    <div className={full ? "a-field a-field--full" : "a-field"} data-msg-required={msgRequired} data-msg-pattern={msgPattern}>
      <label className="a-label" htmlFor={id} id={`${id}-label`}>
        <span>{label}{required && <span className="a-label__required" aria-hidden="true">*</span>}</span>
        {optional && <span className="a-label__optional">Optional</span>}
      </label>
      {children}
      {hint && <p className="a-hint" id={`${id}-hint`}>{hint}</p>}
      <p className="a-error" id={`${id}-error`} />
    </div>
  );
}

type TextProps = Omit<FieldProps, "children" | "id"> & InputHTMLAttributes<HTMLInputElement> & { name: string; id?: string; mask?: string; validate?: string };

export function TextField({ name, id = name, label, required, optional, hint, full, msgRequired, msgPattern, mask, validate, type = "text", ...input }: TextProps) {
  return (
    <Field id={id} label={label} required={required} optional={optional} hint={hint} full={full} msgRequired={msgRequired} msgPattern={msgPattern}>
      <input className="a-input" id={id} name={name} type={type} required={required} data-mask={mask} data-validate={validate} aria-describedby={`${hint ? `${id}-hint ` : ""}${id}-error`} {...input} />
    </Field>
  );
}

type SelectProps = Omit<FieldProps, "children" | "id"> & {
  name: string;
  options?: string[][];
  groups?: [string, string[][]][];
  value?: unknown;
  placeholder: string;
  search?: boolean;
};

/** The design system's listbox. listbox JS keeps the hidden input in sync. */
export function SelectField({ name, label, required, hint, full, msgRequired, options, groups, value, placeholder, search }: SelectProps) {
  const all = options ?? groups?.flatMap(([, items]) => items) ?? [];
  const chosen = all.find(([v]) => v === value);
  const option = ([v, text]: string[]) => (
    <li role="option" className="a-option" data-value={v} aria-selected={v === value} key={v}>{text}<Icon name="check" className="a-option__check" /></li>
  );
  return (
    <Field id={name} label={label} required={required} hint={hint} full={full} msgRequired={msgRequired}>
      <div className="a-select" data-listbox="select" data-icons="check search">
        <button type="button" className="a-select__trigger" id={name} aria-haspopup="listbox" aria-expanded="false" aria-controls={`${name}-list`} aria-labelledby={`${name}-label ${name}-value`} aria-describedby={`${name}-error`}>
          <span className={chosen ? "a-select__value" : "a-select__value is-placeholder"} id={`${name}-value`}>{chosen?.[1] ?? placeholder}</span>
          <Icon name="chevron-down" className="a-select__chevron" />
        </button>
        <input type="hidden" name={name} defaultValue={chosen?.[0] ?? ""} required={required} />
        <div className="a-listbox-popover" hidden>
          {search && (
            <div className="a-listbox-popover__search"><div className="a-input-group"><Icon name="search" /><input className="a-input" type="text" data-listbox-search="" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls={`${name}-list`} aria-label={`Search ${label.toLowerCase()}`} placeholder="Search" /></div></div>
          )}
          <ul className="a-listbox" data-scroll-area role="listbox" id={`${name}-list`} aria-labelledby={`${name}-label`} tabIndex={-1}>
            {groups
              ? groups.map(([group, items], index) => (
                  <li role="presentation" key={group}>
                    <p className="a-listbox__group-label" id={`${name}-g${index}`}>{group}</p>
                    <ul role="group" className="a-listbox__group" aria-labelledby={`${name}-g${index}`}>{items.map(option)}</ul>
                  </li>
                ))
              : options?.map(option)}
          </ul>
        </div>
      </div>
    </Field>
  );
}
