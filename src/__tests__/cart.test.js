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
});
