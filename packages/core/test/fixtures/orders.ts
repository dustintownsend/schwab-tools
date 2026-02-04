/**
 * Test fixtures for order-related tests
 */
import type { Order } from "../../src/schemas/index.js";

export const mockOrders: readonly Order[] = [
  {
    orderId: "1000001",
    accountNumber: "12345678",
    orderType: "LIMIT",
    session: "NORMAL",
    duration: "DAY",
    price: 175.00,
    orderLegCollection: [
      {
        instruction: "BUY",
        quantity: 100,
        instrument: {
          symbol: "AAPL",
          assetType: "EQUITY",
        },
      },
    ],
    orderStrategyType: "SINGLE",
    status: "WORKING",
    filledQuantity: 0,
    remainingQuantity: 100,
    enteredTime: new Date("2024-01-15T10:30:00Z"),
    statusDescription: "Order is working",
  },
  {
    orderId: "1000002",
    accountNumber: "12345678",
    orderType: "MARKET",
    session: "NORMAL",
    duration: "DAY",
    orderLegCollection: [
      {
        instruction: "SELL",
        quantity: 50,
        instrument: {
          symbol: "MSFT",
          assetType: "EQUITY",
        },
      },
    ],
    orderStrategyType: "SINGLE",
    status: "FILLED",
    filledQuantity: 50,
    remainingQuantity: 0,
    enteredTime: new Date("2024-01-15T09:35:00Z"),
    closeTime: new Date("2024-01-15T09:35:02Z"),
    statusDescription: "Order filled",
  },
  {
    orderId: "1000003",
    accountNumber: "12345678",
    orderType: "LIMIT",
    session: "NORMAL",
    duration: "GOOD_TILL_CANCEL",
    price: 2.50,
    orderLegCollection: [
      {
        instruction: "BUY_TO_OPEN",
        quantity: 10,
        instrument: {
          symbol: "AAPL  240119C00180000",
          assetType: "OPTION",
        },
      },
    ],
    orderStrategyType: "SINGLE",
    status: "WORKING",
    filledQuantity: 0,
    remainingQuantity: 10,
    enteredTime: new Date("2024-01-15T11:00:00Z"),
    statusDescription: "Order is working",
  },
  {
    orderId: "1000004",
    accountNumber: "12345678",
    orderType: "LIMIT",
    session: "NORMAL",
    duration: "DAY",
    price: 1.25,
    orderLegCollection: [
      {
        instruction: "SELL_TO_OPEN",
        quantity: 5,
        instrument: {
          symbol: "AAPL  240119C00185000",
          assetType: "OPTION",
        },
      },
      {
        instruction: "BUY_TO_OPEN",
        quantity: 5,
        instrument: {
          symbol: "AAPL  240119C00190000",
          assetType: "OPTION",
        },
      },
    ],
    orderStrategyType: "SINGLE",
    status: "CANCELED",
    filledQuantity: 0,
    remainingQuantity: 5,
    enteredTime: new Date("2024-01-15T12:00:00Z"),
    closeTime: new Date("2024-01-15T14:30:00Z"),
    statusDescription: "Order canceled by user",
  },
];

/**
 * Mock Schwab API order response
 */
export const mockSchwabOrderResponse = {
  session: "NORMAL",
  duration: "DAY",
  orderType: "LIMIT",
  orderLegCollection: [
    {
      orderLegType: "EQUITY",
      legId: 1,
      instrument: {
        assetType: "EQUITY",
        cusip: "037833100",
        symbol: "AAPL",
        description: "APPLE INC",
      },
      instruction: "BUY",
      quantity: 100,
    },
  ],
  orderStrategyType: "SINGLE",
  orderId: 1000001,
  cancelable: true,
  editable: true,
  status: "WORKING",
  enteredTime: "2024-01-15T10:30:00+0000",
  accountNumber: 12345678,
  price: 175.00,
  statusDescription: "Order is working",
};

/**
 * Mock Schwab API orders list response
 */
export const mockSchwabOrdersResponse = [
  mockSchwabOrderResponse,
  {
    session: "NORMAL",
    duration: "DAY",
    orderType: "MARKET",
    orderLegCollection: [
      {
        orderLegType: "EQUITY",
        legId: 1,
        instrument: {
          assetType: "EQUITY",
          symbol: "MSFT",
        },
        instruction: "SELL",
        quantity: 50,
      },
    ],
    orderStrategyType: "SINGLE",
    orderId: 1000002,
    cancelable: false,
    editable: false,
    status: "FILLED",
    enteredTime: "2024-01-15T09:35:00+0000",
    closeTime: "2024-01-15T09:35:02+0000",
    accountNumber: 12345678,
    filledQuantity: 50,
    remainingQuantity: 0,
    statusDescription: "Order filled",
  },
];

/**
 * Mock place order response
 */
export const mockPlaceOrderResponse = {
  orderId: "1000005",
};

/**
 * Rejected order error response
 */
export const mockOrderRejectedResponse = {
  error: "Order rejected",
  message: "Insufficient buying power",
};
