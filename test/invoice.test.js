'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

function assertInvoiceMatchesBilled(items, coupon) {
  const billed = pricing.computeTotals(items, coupon);
  const invoiced = invoice.computeInvoiceFigures({ items: items, coupon: coupon });
  assert.deepEqual(
    { subtotal: invoiced.subtotal, discount: invoiced.discount, tax: invoiced.tax, cgst: invoiced.cgst, sgst: invoiced.sgst, total: invoiced.total },
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total }
  );
  assert.deepEqual(invoiced.rows.map(function (row) { return row.gstPercent; }), billed.lines.map(function (line) { return line.gstPercent; }));
  assert.deepEqual(invoiced.rows.map(function (row) { return row.lineTax; }), billed.lines.map(function (line) { return line.tax; }));
}

test('invoice matches order totals and HSN tax for a no-coupon order', function () {
  assertInvoiceMatchesBilled([
    { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 640, qty: 1 },
    { id: 8, name: 'Tea', sku: 'BEV-001', hsn: '0902', price: 140, qty: 1 }
  ], '');
});

test('invoice matches order totals and GST breakdown after a coupon discount', function () {
  assertInvoiceMatchesBilled([
    { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 640, qty: 1 },
    { id: 8, name: 'Tea', sku: 'BEV-001', hsn: '0902', price: 140, qty: 1 }
  ], 'SAVE10');
});

test('invoice uses the same line tax amounts and split as order pricing', function () {
  const items = [
    { id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 },
    { id: 8, name: 'Tea', hsn: '0902', price: 140, qty: 1 }
  ];
  const billed = pricing.computeTotals(items, 'SAVE10');
  const invoiced = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.deepEqual(invoiced.rows.map(function (row) { return row.lineTax; }), billed.lines.map(function (line) { return line.tax; }));
  assert.equal(invoiced.cgst, billed.cgst);
  assert.equal(invoiced.sgst, billed.sgst);
});

test('invoice HTML shows the matching billed total without a reconciliation warning', function () {
  const items = [{ id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 640, qty: 1 }];
  const billed = pricing.computeTotals(items, '');
  const html = invoice.render({ id: 123, customer: 'Walk-in', paymentMode: 'cash', items: items, coupon: '', total: billed.total });

  assert.ok(html.includes('Invoice Total</td><td class=\"r\">₹672.00'));
  assert.ok(!html.includes('Accountant Reconciliation Notice'));
});
