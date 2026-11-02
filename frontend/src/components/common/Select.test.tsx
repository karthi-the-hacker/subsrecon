import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, SelectOption } from './Select';

const sampleOptions: SelectOption<string>[] = [
  { value: 'new', label: 'New', badgeVariant: 'muted' },
  { value: 'pending', label: 'Pending', badgeVariant: 'warning' },
  { value: 'success', label: 'Success', badgeVariant: 'success' },
];

describe('Select Component', () => {
  it('renders with label and placeholder', () => {
    render(
      <Select
        label="Triage Status"
        placeholder="Choose status..."
        options={sampleOptions}
      />
    );

    expect(screen.getByText('Triage Status')).toBeInTheDocument();
    expect(screen.getByText('Choose status...')).toBeInTheDocument();
  });

  it('displays the current selected value by primitive value', () => {
    render(
      <Select
        value="pending"
        options={sampleOptions}
      />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(
      <Select
        options={sampleOptions}
        error="Status is required"
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Status is required');
  });

  it('calls onChange with primitive value when an option is selected', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Select
        options={sampleOptions}
        value="new"
        onChange={handleChange}
        portal={false}
      />
    );

    const control = screen.getByText('New');
    await user.click(control);

    const option = await screen.findByText('Success');
    await user.click(option);

    expect(handleChange).toHaveBeenCalledWith(
      'success',
      expect.objectContaining({ value: 'success', label: 'Success' }),
      expect.anything()
    );
  });
});
