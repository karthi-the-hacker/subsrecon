import { forwardRef, useId, useMemo } from 'react';
import ReactSelect, {
  Props as ReactSelectProps,
  StylesConfig,
  GroupBase,
  SingleValue,
  MultiValue,
  ActionMeta,
  components,
  DropdownIndicatorProps,
  OptionProps,
  SingleValueProps,
  SelectInstance,
} from 'react-select';
import { ChevronDown, Check } from 'lucide-react';

export type SelectSize = 'sm' | 'md';
export type SelectVariant = 'default' | 'badge';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  dotColor?: string;
  badgeClass?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
  description?: string;
  [key: string]: unknown;
}

export interface CustomSelectProps<T = string | number, IsMulti extends boolean = false>
  extends Omit<
    ReactSelectProps<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>,
    'value' | 'onChange' | 'size'
  > {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: SelectSize;
  variant?: SelectVariant;
  disabled?: boolean;
  options: SelectOption<T>[] | readonly SelectOption<T>[];
  value?: T | T[] | SelectOption<T> | SelectOption<T>[] | null;
  onChange?: (
    value: IsMulti extends true ? T[] : T,
    option: IsMulti extends true ? MultiValue<SelectOption<T>> : SingleValue<SelectOption<T>>,
    actionMeta: ActionMeta<SelectOption<T>>
  ) => void;
  onRawChange?: ReactSelectProps<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>['onChange'];
  containerClassName?: string;
  portal?: boolean;
}

// Badge color mappings for triage status and indicators matching Attack Surface theme
const BADGE_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  success: {
    bg: '#DCFCE7',
    border: '#16A34A',
    text: '#16A34A',
    dot: '#16A34A',
  },
  warning: {
    bg: '#FFF7ED',
    border: '#FF7900',
    text: '#E66D00',
    dot: '#FF7900',
  },
  danger: {
    bg: '#FEE2E2',
    border: '#DC2626',
    text: '#DC2626',
    dot: '#DC2626',
  },
  muted: {
    bg: '#FAFAFA',
    border: '#DCDCDC',
    text: '#666666',
    dot: '#888888',
  },
  default: {
    bg: '#FFFFFF',
    border: '#DCDCDC',
    text: '#111111',
    dot: '#FF7900',
  },
};

const DropdownIndicator = <T, IsMulti extends boolean>(
  props: DropdownIndicatorProps<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>
) => {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown
        className={`w-3.5 h-3.5 text-[#666666] transition-transform duration-150 ${
          props.selectProps.menuIsOpen ? 'rotate-180 text-[#111111]' : ''
        }`}
      />
    </components.DropdownIndicator>
  );
};

const CustomOption = <T, IsMulti extends boolean>(
  props: OptionProps<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>
) => {
  const { data, isSelected } = props;
  const badgeKey = data.badgeVariant || (data.value === 'success' ? 'success' : data.value === 'pending' ? 'warning' : data.value === 'new' ? 'muted' : undefined);
  const badge = badgeKey ? BADGE_STYLES[badgeKey] : undefined;
  const dot = data.dotColor || (badge ? badge.dot : undefined);

  return (
    <components.Option {...props}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {dot && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: dot }}
            />
          )}
          <span className="truncate">{data.label}</span>
          {data.description && (
            <span className="text-[10px] text-[#666666] truncate">({data.description})</span>
          )}
        </div>
        {isSelected && <Check className="w-3.5 h-3.5 text-[#111111] shrink-0 ml-2" />}
      </div>
    </components.Option>
  );
};

const CustomSingleValue = <T, IsMulti extends boolean>(
  props: SingleValueProps<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>
) => {
  const { data } = props;
  const badgeKey = data.badgeVariant || (data.value === 'success' ? 'success' : data.value === 'pending' ? 'warning' : data.value === 'new' ? 'muted' : undefined);
  const badge = badgeKey ? BADGE_STYLES[badgeKey] : undefined;
  const dot = data.dotColor || (badge ? badge.dot : undefined);

  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-1.5 truncate">
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: dot }}
          />
        )}
        <span className="truncate">{data.label}</span>
      </div>
    </components.SingleValue>
  );
};

function SelectInner<T = string | number, IsMulti extends boolean = false>(
  {
    label,
    error,
    helperText,
    required = false,
    size = 'md',
    variant = 'default',
    options,
    value,
    onChange,
    onRawChange,
    className = '',
    containerClassName = '',
    disabled,
    isDisabled,
    isMulti,
    portal = true,
    menuPlacement = 'auto',
    placeholder = 'Select...',
    id,
    styles: customStyles,
    components: customComponents,
    ...restProps
  }: CustomSelectProps<T, IsMulti>,
  ref: React.ForwardedRef<SelectInstance<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>>
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const effectiveDisabled = Boolean(disabled || isDisabled);

  // Normalize current value to match React-Select's expected Option object or array of Options
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null) {
      return isMulti ? ([] as unknown as MultiValue<SelectOption<T>>) : null;
    }

    if (isMulti) {
      if (Array.isArray(value)) {
        return value.map((v) => {
          if (typeof v === 'object' && v !== null && 'value' in v) {
            return v as SelectOption<T>;
          }
          const found = options.find((opt) => opt.value === v);
          return found || ({ value: v, label: String(v) } as SelectOption<T>);
        }) as unknown as MultiValue<SelectOption<T>>;
      }
      return [] as unknown as MultiValue<SelectOption<T>>;
    }

    if (typeof value === 'object' && value !== null && 'value' in value) {
      return value as SelectOption<T>;
    }

    const found = options.find((opt) => opt.value === value);
    return (found || null) as SingleValue<SelectOption<T>>;
  }, [value, options, isMulti]);

  // Current badge style if variant="badge"
  const currentBadgeStyle = useMemo(() => {
    if (variant !== 'badge') return undefined;
    const currentVal = !isMulti && selectedOption ? (selectedOption as SelectOption<T>).value : value;
    const currentOpt = !isMulti && selectedOption ? (selectedOption as SelectOption<T>) : undefined;
    const badgeKey =
      currentOpt?.badgeVariant ||
      (currentVal === 'success' ? 'success' : currentVal === 'pending' ? 'warning' : currentVal === 'new' ? 'muted' : 'default');
    return BADGE_STYLES[badgeKey] || BADGE_STYLES.default;
  }, [variant, selectedOption, value, isMulti]);

  // Handle value change: provide primitive value AND option object to standard onChange
  const handleChange = (
    newValue: SingleValue<SelectOption<T>> | MultiValue<SelectOption<T>>,
    actionMeta: ActionMeta<SelectOption<T>>
  ) => {
    if (onRawChange) {
      (onRawChange as (v: unknown, meta: ActionMeta<SelectOption<T>>) => void)(newValue, actionMeta);
    }

    if (onChange) {
      if (isMulti) {
        const multiVal = (newValue as MultiValue<SelectOption<T>>) || [];
        const primitiveValues = multiVal.map((item) => item.value);
        (onChange as unknown as (v: T[], opt: MultiValue<SelectOption<T>>, meta: ActionMeta<SelectOption<T>>) => void)(
          primitiveValues,
          multiVal,
          actionMeta
        );
      } else {
        const singleVal = newValue as SingleValue<SelectOption<T>>;
        const primitiveValue = singleVal ? singleVal.value : (null as unknown as T);
        (onChange as unknown as (v: T | null, opt: SingleValue<SelectOption<T>>, meta: ActionMeta<SelectOption<T>>) => void)(
          primitiveValue,
          singleVal,
          actionMeta
        );
      }
    }
  };

  const isSmall = size === 'sm';

  const styles: StylesConfig<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>> = useMemo(() => {
    return {
      control: (base, state) => {
        let bg = '#FFFFFF';
        let borderColor = error ? '#DC2626' : state.isFocused ? '#FF7900' : '#DCDCDC';
        let textColor = '#111111';

        if (variant === 'badge' && currentBadgeStyle) {
          bg = currentBadgeStyle.bg;
          borderColor = state.isFocused ? '#FF7900' : currentBadgeStyle.border;
          textColor = currentBadgeStyle.text;
        }

        return {
          ...base,
          backgroundColor: bg,
          borderColor: borderColor,
          borderRadius: isSmall ? '2px' : '3px',
          minHeight: isSmall ? '28px' : '36px',
          height: isSmall ? '28px' : '36px',
          fontSize: isSmall ? '12px' : '13px',
          fontFamily: '"Space Grotesk", "JetBrains Mono", monospace',
          fontWeight: variant === 'badge' ? 600 : 500,
          color: textColor,
          boxShadow: 'none',
          '&:hover': {
            borderColor: state.isFocused
              ? '#FF7900'
              : variant === 'badge' && currentBadgeStyle
              ? currentBadgeStyle.border
              : '#111111',
          },
          cursor: effectiveDisabled ? 'not-allowed' : 'pointer',
          opacity: effectiveDisabled ? 0.5 : 1,
          transition: 'border-color 0.15s ease-in-out',
        };
      },
      valueContainer: (base) => ({
        ...base,
        padding: isSmall ? '0 6px' : '0 10px',
        height: isSmall ? '26px' : '34px',
        display: 'flex',
        alignItems: 'center',
      }),
      singleValue: (base) => ({
        ...base,
        color: variant === 'badge' && currentBadgeStyle ? currentBadgeStyle.text : '#111111',
        fontSize: isSmall ? '12px' : '13px',
        fontWeight: variant === 'badge' ? 600 : 500,
        margin: 0,
      }),
      placeholder: (base) => ({
        ...base,
        color: '#888888',
        fontSize: isSmall ? '12px' : '13px',
        margin: 0,
      }),
      input: (base) => ({
        ...base,
        color: '#111111',
        fontSize: isSmall ? '12px' : '13px',
        margin: 0,
        padding: 0,
      }),
      indicatorSeparator: () => ({
        display: 'none',
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: isSmall ? '26px' : '34px',
      }),
      dropdownIndicator: (base) => ({
        ...base,
        padding: isSmall ? '2px 6px' : '4px 8px',
        color: variant === 'badge' && currentBadgeStyle ? currentBadgeStyle.text : '#666666',
        '&:hover': {
          color: '#111111',
        },
      }),
      clearIndicator: (base) => ({
        ...base,
        padding: isSmall ? '2px 4px' : '4px 6px',
        color: '#888888',
        '&:hover': {
          color: '#DC2626',
        },
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: '#FFFFFF',
        border: '1px solid #111111',
        borderRadius: '3px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: '3px',
        zIndex: 9999,
        minWidth: isSmall ? '120px' : '160px',
      }),
      menuList: (base) => ({
        ...base,
        padding: 0,
        maxHeight: '220px',
      }),
      option: (base, state) => {
        let bg = 'transparent';
        let color = '#111111';

        if (state.isSelected) {
          bg = '#FF7900';
          color = '#111111';
        } else if (state.isFocused) {
          bg = '#FFF7ED';
          color = '#111111';
        }

        return {
          ...base,
          backgroundColor: bg,
          color: color,
          borderRadius: '2px',
          padding: isSmall ? '5px 8px' : '7px 10px',
          fontSize: isSmall ? '12px' : '13px',
          fontFamily: '"Space Grotesk", "JetBrains Mono", monospace',
          fontWeight: state.isSelected ? 700 : 500,
          cursor: state.isDisabled ? 'not-allowed' : 'pointer',
          opacity: state.isDisabled ? 0.4 : 1,
          '&:active': {
            backgroundColor: '#E66D00',
            color: '#111111',
          },
        };
      },
      multiValue: (base) => ({
        ...base,
        backgroundColor: '#FFF7ED',
        border: '1px solid #FF7900',
        borderRadius: '2px',
        margin: '1px 3px 1px 0',
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: '#111111',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        padding: '1px 5px',
      }),
      multiValueRemove: (base) => ({
        ...base,
        color: '#666666',
        ':hover': {
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
        },
      }),
      noOptionsMessage: (base) => ({
        ...base,
        color: '#888888',
        fontSize: isSmall ? '12px' : '13px',
        padding: '8px 12px',
      }),
      ...customStyles,
    };
  }, [error, variant, currentBadgeStyle, isSmall, effectiveDisabled, customStyles]);

  const mergedComponents = useMemo(() => {
    return {
      DropdownIndicator,
      Option: CustomOption,
      SingleValue: CustomSingleValue,
      ...customComponents,
    };
  }, [customComponents]);

  return (
    <div className={`w-full flex flex-col space-y-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-bold text-[#111111] uppercase tracking-wider">
          {label}
          {required && <span className="text-danger ml-1 font-bold">*</span>}
        </label>
      )}

      <ReactSelect
        id={selectId}
        ref={ref}
        options={options as SelectOption<T>[]}
        value={selectedOption}
        onChange={handleChange}
        isDisabled={effectiveDisabled}
        isMulti={isMulti}
        placeholder={placeholder}
        menuPlacement={menuPlacement}
        menuPortalTarget={portal && typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
        styles={styles}
        components={mergedComponents}
        className={`react-select-container ${className}`}
        classNamePrefix="rs"
        {...restProps}
      />

      {error && (
        <p className="text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="text-xs text-[#666666]">
          {helperText}
        </p>
      )}
    </div>
  );
}

export const Select = forwardRef(SelectInner) as <
  T = string | number,
  IsMulti extends boolean = false
>(
  props: CustomSelectProps<T, IsMulti> & {
    ref?: React.ForwardedRef<SelectInstance<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>>;
  }
) => React.ReactElement;

export default Select;
