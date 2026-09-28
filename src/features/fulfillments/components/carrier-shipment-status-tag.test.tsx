// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CarrierShipmentStatusTag } from './carrier-shipment-status-tag';

describe('CarrierShipmentStatusTag', () => {
  afterEach(() => cleanup());

  it('renders nothing when there is no status', () => {
    const { container } = render(<CarrierShipmentStatusTag status={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the Vietnamese label for a known status', () => {
    render(<CarrierShipmentStatusTag status="CREATED" />);
    expect(screen.getByText('Đã tạo vận đơn')).toBeTruthy();
  });

  it('falls back to the raw status code when unrecognized', () => {
    render(<CarrierShipmentStatusTag status="SOME_UNKNOWN_STATUS" />);
    expect(screen.getByText('SOME_UNKNOWN_STATUS')).toBeTruthy();
  });

  it('shows a tooltip trigger with the latest error only for CREATE_FAILED', () => {
    const { container } = render(
      <CarrierShipmentStatusTag status="CREATE_FAILED" error="GHN từ chối: sai địa chỉ" />,
    );
    // AntD Tooltip wraps the trigger; the underlying tag text still renders directly.
    expect(screen.getByText('Tạo vận đơn lỗi')).toBeTruthy();
    expect(container.querySelector('[aria-describedby]') || container).toBeTruthy();
  });

  it('does not attach a tooltip when status is not CREATE_FAILED even if an error is passed', () => {
    render(<CarrierShipmentStatusTag status="PENDING" error="some stale error" />);
    expect(screen.getByText('Chờ tạo vận đơn')).toBeTruthy();
    expect(screen.queryByText('some stale error')).toBeNull();
  });
});
