/**
 * Unit tests for cart logic.
 * Tests addItem and removeItem functions from the cart hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from '../lib/cart';
import React from 'react';

// Mock firestore to avoid Firebase initialization errors
vi.mock('../lib/firestore', () => ({
  validateCoupon: vi.fn(),
}));

/**
 * Test component to interact with the cart hook.
 */
function TestComponent() {
  const { items, addItem, removeItem } = useCart();
  return (
    <div>
      <div data-testid="item-count">{items.length}</div>
      <button
        onClick={() =>
          addItem({
            serviceId: 'test-1',
            serviceType: 'tour',
            serviceTitle: 'Test Tour',
            startDate: '2026-05-06',
            total: 100,
          })
        }
      >
        Add Item
      </button>
      {items.map((item, index) => (
        <div key={index}>
          <span>{item.serviceTitle}</span>
          <button onClick={() => removeItem(index)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

describe('Cart Logic', () => {
  it('should add an item to the cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);

    expect(screen.getByTestId('item-count').textContent).toBe('1');
    expect(screen.getByText('Test Tour')).toBeDefined();
  });

  it('should remove an item from the cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    expect(screen.getByTestId('item-count').textContent).toBe('1');

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    expect(screen.getByTestId('item-count').textContent).toBe('0');
  });

  it('should return correct displayQuantity for different service types', () => {
    function DropdownTestComponent() {
      const { addItem, getCartItemsForDropdown, getCartTotalItems } = useCart();
      const items = getCartItemsForDropdown();
      return (
        <div>
          <div data-testid="total-items">{getCartTotalItems()}</div>
          <button
            onClick={() =>
              addItem({
                serviceId: 'hotel-1',
                serviceType: 'hotel_room',
                rooms: 2,
                startDate: '2026-05-06',
                total: 200,
              })
            }
          >
            Add Hotel
          </button>
          <button
            onClick={() =>
              addItem({
                serviceId: 'tour-1',
                serviceType: 'tour',
                adults: 2,
                children: 1,
                startDate: '2026-05-06',
                total: 300,
              })
            }
          >
            Add Tour
          </button>
          <div data-testid="items">
            {items.map((item) => (
              <div key={item.serviceId} data-testid={`item-${item.serviceId}`}>
                {item.displayQuantity}
              </div>
            ))}
          </div>
        </div>
      );
    }

    render(
      <CartProvider>
        <DropdownTestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Hotel'));
    fireEvent.click(screen.getByText('Add Tour'));

    expect(screen.getByTestId('total-items').textContent).toBe('2');
    expect(screen.getByTestId('item-hotel-1').textContent).toBe('2');
    expect(screen.getByTestId('item-tour-1').textContent).toBe('3');
  });

  it('should update item quantity correctly', () => {
    function UpdateTestComponent() {
      const { addItem, updateItemQuantity, getCartItemsForDropdown } = useCart();
      const items = getCartItemsForDropdown();
      return (
        <div>
          <button
            onClick={() =>
              addItem({
                serviceId: 'hotel-1',
                serviceType: 'hotel_room',
                roomId: 'room-1',
                rooms: 1,
                startDate: '2026-05-06',
                basePrice: 100,
                total: 100,
              })
            }
          >
            Add Hotel
          </button>
          <button
            onClick={() =>
              updateItemQuantity({ serviceId: 'hotel-1', roomId: 'room-1', startDate: '2026-05-06' }, 3)
            }
          >
            Update Qty
          </button>
          <div data-testid="qty">
            {items[0]?.displayQuantity}
          </div>
          <div data-testid="total">
            {items[0]?.total}
          </div>
        </div>
      );
    }

    render(
      <CartProvider>
        <UpdateTestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Hotel'));
    expect(screen.getByTestId('qty').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('100');

    fireEvent.click(screen.getByText('Update Qty'));
    expect(screen.getByTestId('qty').textContent).toBe('3');
    expect(screen.getByTestId('total').textContent).toBe('300');
  });
});
