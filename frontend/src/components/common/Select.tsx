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

// Badge color mappings for triage status and indicators
const BADGE_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  success: {
    bg: 'rgba(0, 255, 136, 0.15)',
    border: 'rgba(0, 255, 136, 0.45)',
    text: '#00FF88',
    dot: '#00FF88',
  },
  warning: {
    bg: 'rgba(255, 176, 0, 0.15)',
    border: 'rgba(255, 176, 0, 0.45)',
    text: '#FFB000',
    dot: '#FFB000',
  },
  danger: {
    bg: 'rgba(255, 42, 95, 0.15)',
    border: 'rgba(255, 42, 95, 0.45)',
    text: '#FF2A5F',
    dot: '#FF2A5F',
  },
  muted: {
    bg: 'rgba(9, 18, 36, 0.85)',
    border: '#152542',
    text: '#64748B',
    dot: '#64748B',
  },
  default: {
    bg: 'rgba(9, 18, 36, 0.85)',
    border: '#152542',
    text: '#E6F4F1',
    dot: '#00FF88',
  },
};

const DropdownIndicator = <T, IsMulti extends boolean>(
  props: DropdownIndicatorProps<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>
) => {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown
        className={`w-3.5 h-3.5 text-dark-muted transition-transform duration-200 ${
          props.selectProps.menuIsOpen ? 'rotate-180 text-dark-text' : ''
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
            <span className="text-[10px] text-dark-muted truncate">({data.description})</span>
          )}
        </div>
        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
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
        let bg = 'rgba(9, 18, 36, 0.85)';
        let borderColor = error ? '#FF2A5F' : state.isFocused ? '#00FF88' : '#152542';
        let textColor = '#E6F4F1';

        if (variant === 'badge' && currentBadgeStyle) {
          bg = currentBadgeStyle.bg;
          borderColor = state.isFocused ? '#00FF88' : currentBadgeStyle.border;
          textColor = currentBadgeStyle.text;
        }

        return {
          ...base,
          backgroundColor: bg,
          borderColor: borderColor,
          borderRadius: isSmall ? '6px' : '8px',
          minHeight: isSmall ? '28px' : '38px',
          height: isSmall ? '28px' : '38px',
          fontSize: isSmall ? '12px' : '14px',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: variant === 'badge' ? 600 : 400,
          color: textColor,
          boxShadow: state.isFocused
            ? error
              ? '0 0 0 1px #FF2A5F, 0 0 10px rgba(255, 42, 95, 0.3)'
              : '0 0 0 1px #00FF88, 0 0 10px rgba(0, 255, 136, 0.3)'
            : 'none',
          '&:hover': {
            borderColor: state.isFocused
              ? '#00FF88'
              : variant === 'badge' && currentBadgeStyle
              ? currentBadgeStyle.border
              : '#223B68',
          },
          cursor: effectiveDisabled ? 'not-allowed' : 'pointer',
          opacity: effectiveDisabled ? 0.5 : 1,
          transition: 'all 0.15s ease-in-out',
        };
      },
      valueContainer: (base) => ({
        ...base,
        padding: isSmall ? '0 6px' : '0 10px',
        height: isSmall ? '26px' : '36px',
        display: 'flex',
        alignItems: 'center',
      }),
      singleValue: (base) => ({
        ...base,
        color: variant === 'badge' && currentBadgeStyle ? currentBadgeStyle.text : '#F8FAFC',
        fontSize: isSmall ? '12px' : '14px',
        fontWeight: variant === 'badge' ? 500 : 400,
        margin: 0,
      }),
      placeholder: (base) => ({
        ...base,
        color: '#94A3B8',
        opacity: 0.6,
        fontSize: isSmall ? '12px' : '14px',
        margin: 0,
      }),
      input: (base) => ({
        ...base,
        color: '#F8FAFC',
        fontSize: isSmall ? '12px' : '14px',
        margin: 0,
        padding: 0,
      }),
      indicatorSeparator: () => ({
        display: 'none',
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: isSmall ? '26px' : '36px',
      }),
      dropdownIndicator: (base) => ({
        ...base,
        padding: isSmall ? '2px 6px' : '4px 8px',
        color: variant === 'badge' && currentBadgeStyle ? currentBadgeStyle.text : '#94A3B8',
        '&:hover': {
          color: '#F8FAFC',
        },
      }),
      clearIndicator: (base) => ({
        ...base,
        padding: isSmall ? '2px 4px' : '4px 6px',
        color: '#94A3B8',
        '&:hover': {
          color: '#EF4444',
        },
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: '#091224',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '8px',
        boxShadow:
          '0 15px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 255, 136, 0.1)',
        padding: '4px',
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
        let color = '#E6F4F1';

        if (state.isSelected) {
          bg = '#00FF88';
          color = '#04070F';
        } else if (state.isFocused) {
          bg = 'rgba(0, 255, 136, 0.15)';
          color = '#00FF88';
        }

        return {
          ...base,
          backgroundColor: bg,
          color: color,
          borderRadius: '6px',
          padding: isSmall ? '5px 8px' : '7px 10px',
          fontSize: isSmall ? '12px' : '13px',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: state.isSelected ? 700 : 500,
          cursor: state.isDisabled ? 'not-allowed' : 'pointer',
          opacity: state.isDisabled ? 0.4 : 1,
          '&:active': {
            backgroundColor: '#00E57A',
            color: '#04070F',
          },
        };
      },
      multiValue: (base) => ({
        ...base,
        backgroundColor: 'rgba(0, 255, 136, 0.15)',
        border: '1px solid rgba(0, 255, 136, 0.4)',
        borderRadius: '4px',
        margin: '1px 3px 1px 0',
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: '#F8FAFC',
        fontSize: isSmall ? '11px' : '12px',
        padding: '1px 5px',
      }),
      multiValueRemove: (base) => ({
        ...base,
        color: '#94A3B8',
        ':hover': {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#EF4444',
        },
      }),
      noOptionsMessage: (base) => ({
        ...base,
        color: '#94A3B8',
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
    <div className={`w-full flex flex-col space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-dark-text tracking-wide">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
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
        <p className="text-xs text-dark-muted">
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
